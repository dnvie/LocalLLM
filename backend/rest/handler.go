package rest

import (
	"LocalLLM/data"
	"LocalLLM/service"
	"encoding/json"
	"log"
	"net/http"

	"github.com/go-chi/chi"
	"github.com/google/uuid"
)

// Returns the list of models available in the Ollama server.
func GetModels(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	modelsJSON, err := json.Marshal(data.ModelsList)
	if err != nil {
		log.Println("Error: ", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Write(modelsJSON)
}

// Returns the list of chats from a user.
func GetChats(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := chi.URLParam(r, "id")
	chats, err := service.QueryChatsFromUser(userID)
	if err != nil {
		log.Println("Error: ", err)
		http.Error(w, "Error processing chat", http.StatusInternalServerError)
		return
	}
	chatsJSON, err := json.Marshal(chats)
	if err != nil {
		log.Println("Error: ", err)
		http.Error(w, "Error processing chat", http.StatusInternalServerError)
		return
	}
	w.Write(chatsJSON)
}

// Returns the list of messages from a chat.
func GetChat(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	chatID := chi.URLParam(r, "id")
	messages, err := service.QueryMessagesFromChat(chatID)
	if err != nil {
		log.Println("Error: ", err)
		http.Error(w, "Error processing chat", http.StatusInternalServerError)
		return
	}
	messagesJSON, err := json.Marshal(messages)
	if err != nil {
		log.Println("Error: ", err)
		http.Error(w, "Error processing chat", http.StatusInternalServerError)
		return
	}
	w.Write(messagesJSON)
}

// Processes a query and returns the response from the Ollama server.
// This method does not append the message history as context to the LLM.
// This method is currently not in use. May be implemented in the future for a "temporary" chat feature.
/*func ProcessQuery(w http.ResponseWriter, r *http.Request) {
model := chi.URLParam(r, "model")
ok, modelName := service.IsValidModel(model)
if !ok {
	http.Error(w, "Invalid model", http.StatusBadRequest)
	return
}
var req data.QueryRequest
if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
	http.Error(w, "Invalid request body", http.StatusBadRequest)
	return
}

if req.Query == "" {
	http.Error(w, "Invalid query", http.StatusBadRequest)
	return
}

var requestData data.Request
requestData.Model = modelName
requestData.Prompt = req.Query
requestData.Stream = true

w.Header().Set("Access-Control-Allow-Origin", "*")
w.Header().Set("Access-Control-Expose-Headers", "chat_id")
w.Header().Set("Content-Type", "application/json")
w.Header().Set("Transfer-Encoding", "chunked")
w.WriteHeader(http.StatusOK)

err := service.QueryLLM(w, requestData)
if err != nil {
	http.Error(w, "Error processing query", http.StatusInternalServerError)
	return
}
}*/

// Processes a chat and returns the response from the Ollama server.
// This method appends the message history as context to the LLM.
func ProcessChat(w http.ResponseWriter, r *http.Request) {
	model := chi.URLParam(r, "model")
	//Checks if the provided model is present on the Ollama server
	ok, modelName := service.IsValidModel(model)
	if !ok {
		http.Error(w, "Invalid model", http.StatusBadRequest)
		return
	}

	//Decoding the request body
	var req data.QueryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Println("Error: ", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Query == "" {
		http.Error(w, "Invalid query", http.StatusBadRequest)
		return
	}

	// Truncate the query to 40 characters, to use as chat title
	runes := []rune(req.Query)
	if len(runes) > 40 {
		runes = runes[:40]
	}

	chatID := chi.URLParam(r, "id")
	// Generate a new chat ID and store it in the database
	if chatID == "" || chatID == "new" {
		chatID = uuid.New().String()
		err := data.InsertChat(chatID, "91a91610-7998-47e2-bbcb-e6fa98d3478d", string(runes))
		if err != nil {
			log.Println("Error: ", err)
			http.Error(w, "Error processing chat", http.StatusInternalServerError)
			return
		}
	}

	var augmentations []string

	if len(req.Files) > 0 {
		if err := data.CreateAndAddEmbedding(chatID, req.Files, req.FileNames, req.FileTypes); err != nil {
			log.Println("Error: ", err)
			http.Error(w, "Error processing chat", http.StatusInternalServerError)
			return
		} else {
			augmentations = data.QueryVectorDb(chatID, req.Query)
		}
	}

	// Generate the thumbnail that we store in the database
	img := service.GenerateThumbnail(req.Images)

	// Insert the user message into the database
	err := data.InsertMessage(chatID, "user", req.Query, "", modelName, img, req.AttachmentName, req.AttachmentType, req.FileNames, req.FileTypes, false)
	if err != nil {
		log.Println("Error: ", err)
		http.Error(w, "Error processing chat", http.StatusInternalServerError)
		return
	}

	// Retrieve all messages sent in this chat (including the current query that was just stored)
	messages, err := data.QueryMessagesFromChatWithoutImages(chatID)
	if err != nil {
		log.Println("Error: ", err)
		http.Error(w, "Error processing chat", http.StatusInternalServerError)
		return
	}

	if len(req.Images) > 0 {
		// Append the full-size image to the query, instead of the small thumbnail that is stored in the database.
		messages[len(messages)-1].Images = req.Images

		// If the query contains an image, we omit the chat history, as the LLM (apparently) can only process an image if a single message is given as context.
		messages = messages[len(messages)-1:]
	}

	if len(req.Files) > 0 {
		enhancedQuery := messages[len(messages)-1].Content + "Additional information retrieved from attached files:"

		for _, augmentation := range augmentations {
			enhancedQuery += augmentation
		}

		// Append the enhanced query to the messages slice
		messages[len(messages)-1].Content = enhancedQuery
	}

	// Prepare the request data to invoke the QueryLLMChat method in the service package
	var requestData data.ChatRequest
	requestData.Model = modelName
	requestData.Messages = messages
	requestData.Stream = true

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Transfer-Encoding", "chunked")
	// Send the chat ID in the response header, so the client can retrieve it as soon as the first chunks of the streamed response are received.
	w.Header().Set("Access-Control-Expose-Headers", "chat_id")
	w.Header().Set("chat_id", chatID)
	w.WriteHeader(http.StatusOK)

	// Call the QueryLLMChat method in the service package to process the chat
	err = service.QueryLLMChat(w, requestData, chatID)
	if err != nil {
		log.Println("Error: ", err)
		http.Error(w, "Error processing chat", http.StatusInternalServerError)
		return
	}
}

// Updates the title of a chat.
func UpdateChatTitle(w http.ResponseWriter, r *http.Request) {
	chatID := chi.URLParam(r, "id")
	var req data.ChatTitle
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	err := service.UpdateChatTitle(chatID, req.Title)
	if err != nil {
		http.Error(w, "Error processing chat", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

// Deletes a chat.
func DeleteChat(w http.ResponseWriter, r *http.Request) {
	chatID := chi.URLParam(r, "id")
	err := service.DeleteChat(chatID)
	if err != nil {
		http.Error(w, "Error processing chat", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

// Stores any messages that were interrupted by the user during generation.
func AddInterruptedMessage(w http.ResponseWriter, r *http.Request) {
	chatID := chi.URLParam(r, "id")
	var message data.Message
	if err := json.NewDecoder(r.Body).Decode(&message); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	err := service.AddInterruptedMessage(chatID, message)
	if err != nil {
		http.Error(w, "Error processing chat", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func GetImages(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	chatID := chi.URLParam(r, "id")
	images, err := service.GetImagesFromChat(chatID)
	if err != nil {
		http.Error(w, "Error getting images", http.StatusInternalServerError)
		return
	}
	imagesJSON, err := json.Marshal(images)
	if err != nil {
		http.Error(w, "Error getting images", http.StatusInternalServerError)
		return
	}
	w.Write(imagesJSON)
}
