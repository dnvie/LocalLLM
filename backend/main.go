package main

import (
	"LocalLLM/data"
	"LocalLLM/rest"
	"LocalLLM/service"
	"net/http"

	_ "github.com/mattn/go-sqlite3"
)

func main() {

	// Initialize the database.
	data.InitDb()
	data.InitVectorDB()

	// Load the models from the Ollama server.
	status, _ := service.LoadModels()
	if status != http.StatusOK {
		panic("Error loading models")
	}

	// Starts the server.
	rest.Serve()

}
