package service

import (
	"LocalLLM/data"
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"image/jpeg"
	"io"
	"net/http"
	"os"
	"sort"
	"strings"

	"github.com/disintegration/imaging"
	"github.com/rwcarlsen/goexif/exif"
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

func GenerateThumbnail(base64string []string) string {
	if len(base64string) == 0 {
		return ""
	}
	imgData, err := base64.StdEncoding.DecodeString(base64string[0])
	if err != nil {
		return ""
	}

	img, err := imaging.Decode(bytes.NewReader(imgData))
	if err != nil {
		return ""
	}

	exifData, err := exif.Decode(bytes.NewReader(imgData))
	if err == nil {
		orientation, err := exifData.Get(exif.Orientation)
		if err == nil {
			switch orientation.String() {
			case "3":
				img = imaging.Rotate180(img)
			case "6":
				img = imaging.Rotate270(img)
			case "8":
				img = imaging.Rotate90(img)
			}
		}
	}

	width := img.Bounds().Dx()
	height := img.Bounds().Dy()
	var newWidth, newHeight int
	if width < height {
		newWidth = 50
		newHeight = int(float64(height) / float64(width) * 50)
	} else {
		newHeight = 50
		newWidth = int(float64(width) / float64(height) * 50)
	}
	resizedImg := imaging.Resize(img, newWidth, newHeight, imaging.Lanczos)

	var buffer bytes.Buffer
	err = jpeg.Encode(&buffer, resizedImg, nil)
	if err != nil {
		return ""
	}

	encodedThumbnail := base64.StdEncoding.EncodeToString(buffer.Bytes())
	return encodedThumbnail
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
