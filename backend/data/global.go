package data

import (
	"database/sql"
	"sync"

	"github.com/philippgille/chromem-go"
)

var (
	ModelsList     Models
	ModelsMux      sync.Mutex
	Db             *sql.DB
	VectorDb       *chromem.DB
	Collection     *chromem.Collection
	NResults       int    = 5
	ChunkSize      int    = 512
	Overlap        int    = 128
	EmbeddingModel string = "snowflake-arctic-embed2"
)

// Specify the Ollama server address here: (example: "http://127.0.0.1:11434")
const OLLAMA_SERVER = "http://<ip-address>:<port>"
