package data

import (
	"database/sql"
	"sync"
)

var (
	ModelsList Models
	ModelsMux  sync.Mutex
	Db         *sql.DB
)

// Specify the Ollama server address here: (example: "http://127.0.0.1:11434")
const OLLAMA_SERVER = "http://<ip-address>:<port>"
