package data

import (
	"context"
	"errors"
	"runtime"
	"strconv"
	"strings"

	"github.com/philippgille/chromem-go"
)

func InitVectorDB() {
	VectorDb, err := chromem.NewPersistentDB("./data", false)
	if err != nil {
		panic(err)
	}

	// Using the id of the default user as a collection id for now.
	Collection, err = VectorDb.GetOrCreateCollection("91a91610-7998-47e2-bbcb-e6fa98d3478d", nil, chromem.NewEmbeddingFuncOllama(EmbeddingModel, OLLAMA_SERVER+"/api"))
	if err != nil {
		panic(err)
	}
}

func CreateAndAddEmbedding(chatID string, files, fileNames, fileTypes []string) error {
	ctx := context.Background()

	if len(files) != len(fileNames) || len(files) != len(fileTypes) || len(fileTypes) != len(fileNames) {
		return errors.New("Lenght of files, fileNames and fileTypes must be equal")
	}

	var docs []chromem.Document

	for i := range files {
		chunks := fixedSizeChunking(files[i], 512, 128)
		for _, chunk := range chunks {
			docs = append(docs, chromem.Document{
				ID: chatID + "-" + strconv.Itoa(i),
				Metadata: map[string]string{
					"filename": fileNames[i],
					"filetype": fileTypes[i],
					"chatID":   chatID,
				},
				Content: chunk,
			})
		}
	}

	err := Collection.AddDocuments(ctx, docs, runtime.NumCPU())
	if err != nil {
		return err
	}
	return nil
}

func QueryVectorDb(chatID, query string) []string {
	ctx := context.Background()

	documentNumber := Collection.Count()
	if NResults > documentNumber {
		NResults = documentNumber
	}

	options := chromem.QueryOptions{
		QueryText: query,
		Where: map[string]string{
			"chatID": chatID,
		},
		NResults: NResults,
	}
	results, err := Collection.QueryWithOptions(ctx, options)
	if err != nil {
		return nil
	}
	var resultsText []string
	for _, result := range results {
		resultsText = append(resultsText, result.Content)
	}

	return resultsText
}

// Split a string into evenly sized chunks with a defined overlap.
func fixedSizeChunking(text string, chunkSize, overlap int) []string {
	words := strings.Fields(text)
	var chunks []string
	for i := 0; i < len(words); i += (chunkSize - overlap) {
		end := i + chunkSize
		if end > len(words) {
			end = len(words)
		}
		chunks = append(chunks, strings.Join(words[i:end], " "))

		if end == len(words) {
			break
		}
	}
	return chunks
}
