package service

import (
	"LocalLLM/data"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

// Send a query to the Ollama server and returns the response as a stream of chunks.
// This method is currently not in use. May be implemented in the future for a "temporary" chat feature.
/*func QueryLLM(w http.ResponseWriter, reqData data.Request) error {
url := data.OLLAMA_SERVER + "/api/generate"

jsonData, err := json.Marshal(reqData)
if err != nil {
	return fmt.Errorf("failed to marshal request data: %v", err)
}

client := http.Client{
	Timeout: 0,
}

httpReq, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(jsonData))
if err != nil {
	return fmt.Errorf("failed to create request: %v", err)
}

resp, err := client.Do(httpReq)
if err != nil {
	return fmt.Errorf("request failed: %v", err)
}
defer resp.Body.Close()

if resp.StatusCode != http.StatusOK {
	return fmt.Errorf("unexpected status code: %d", resp.StatusCode)
}

w.Header().Set("Content-Type", "text/event-stream")
w.Header().Set("Transfer-Encoding", "chunked")
w.WriteHeader(http.StatusOK)

decoder := json.NewDecoder(resp.Body)

for {
	var apiResponse data.Response

	if err := decoder.Decode(&apiResponse); err == io.EOF {
		break
	} else if err != nil {
		return fmt.Errorf("failed to decode JSON: %v", err)
	}

	if apiResponse.Response != "" {
		err = writeChunk(w, apiResponse.Response)
		if err != nil {
			return fmt.Errorf("failed to write chunk: %v", err)
		}
	}

	if apiResponse.Done {
		break
	}
}

return nil
}*/

func QueryLLMChat(w http.ResponseWriter, reqData data.ChatRequest, chatID string) error {
	url := data.OLLAMA_SERVER + "/api/chat"

	// Unpack the request data
	jsonData, err := json.Marshal(reqData)
	if err != nil {
		return fmt.Errorf("failed to marshal request data: %v", err)
	}

	// Create a new HTTP client
	client := http.Client{
		Timeout: 0,
	}

	// Send the request to the Ollama server
	httpReq, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %v", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(httpReq)
	if err != nil {
		return fmt.Errorf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	// Set the headers for the response writer to support streaming of the response
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Transfer-Encoding", "chunked")
	w.WriteHeader(http.StatusOK)

	decoder := json.NewDecoder(resp.Body)

	var fullResponse string

	// While loop to read the chunked response from the Ollama server
	for {
		var apiResponse data.ChatResponse

		if err := decoder.Decode(&apiResponse); err == io.EOF {
			break
		} else if err != nil {
			return fmt.Errorf("failed to decode JSON: %v", err)
		}

		// Whilte the repsonse is not empty, return the current chunk
		if apiResponse.Message.Content != "" {

			fullResponse += apiResponse.Message.Content

			err = writeChunk(w, apiResponse.Message.Content)
			if err != nil {
				return fmt.Errorf("failed to write chunk: %v", err)
			}
		}

		if apiResponse.Done {
			break
		}
	}

	// Save the complete response to the database
	data.InsertMessage(chatID, "assistant", fullResponse, reqData.Model, "", "", false)

	return nil
}

// Helper function to write a chunk to the response writer.
func writeChunk(w http.ResponseWriter, chunk string) error {
	_, err := fmt.Fprintf(w, "%s", chunk)
	if err != nil {
		return fmt.Errorf("failed to write chunk: %v", err)
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		return fmt.Errorf("failed to get flusher")
	}
	flusher.Flush()

	return nil
}
