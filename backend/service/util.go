package service

import (
	"LocalLLM/data"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"sort"
	"strings"
)

// Loads the list of models from the Ollama server.
func LoadModels() (int, data.Models) {
	resp, err := http.Get(data.OLLAMA_SERVER + "/api/tags")
	if err != nil {
		fmt.Println("Error loading model list:", err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Println("Error reading response body:", err)
		os.Exit(1)
	}

	var models data.Models
	err = json.Unmarshal(body, &models)
	if err != nil {
		fmt.Println("Error unmarshalling JSON:", err)
		os.Exit(1)
	}

	// Filters embedding models from the list of available models.
	for i := 0; i < len(models.Models); i++ {
		if models.Models[i].Details.Family == "bert" {
			models.Models = append(models.Models[:i], models.Models[i+1:]...)
			i--
		} else {
			models.Models[i].NameTrimmed = strings.Split(models.Models[i].Name, ":")[0]
		}
	}

	// Sorts the list of models by name.
	sort.Slice(models.Models, func(i, j int) bool {
		return models.Models[i].Name < models.Models[j].Name
	})

	// Updates the global list of models.
	data.ModelsMux.Lock()
	data.ModelsList = models
	data.ModelsMux.Unlock()

	return resp.StatusCode, models
}

// Checks if a given model name is a valid model in our ModelsList.
func IsValidModel(model string) (bool, string) {
	for _, m := range data.ModelsList.Models {
		if m.Name == model || m.NameTrimmed == model {
			return true, m.Name
		}
	}
	return false, ""
}

func QueryChatsFromUser(userID string) ([]data.Chat, error) {
	return data.QueryChatsFromUser(userID)
}

func QueryMessagesFromChat(chatID string) ([]data.Message, error) {
	return data.QueryMessagesFromChat(chatID)
}

func UpdateChatTitle(chatID, title string) error {
	if len(title) > 40 {
		title = title[:40]
	}
	return data.UpdateChatTitle(chatID, title)
}

func DeleteChat(chatID string) error {
	return data.DeleteChat(chatID)
}

func AddInterruptedMessage(chatID string, message data.Message) error {
	return data.AddInterruptedMessage(chatID, message)
}
