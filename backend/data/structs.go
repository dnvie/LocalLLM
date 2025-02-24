package data

import "time"

type Models struct {
	Models []Model `json:"models"`
}

type Model struct {
	Name        string       `json:"name"`
	NameTrimmed string       `json:"name_trimmed"`
	Model       string       `json:"model"`
	ModifiedAt  time.Time    `json:"modified_at"`
	Size        int64        `json:"size"`
	Digest      string       `json:"digest"`
	Details     ModelDetails `json:"details"`
}

type ModelDetails struct {
	ParentModel       string   `json:"parent_model"`
	Format            string   `json:"format"`
	Family            string   `json:"family"`
	Families          []string `json:"families"`
	ParameterSize     string   `json:"parameter_size"`
	QuantizationLevel string   `json:"quantization_level"`
}

type QueryRequest struct {
	Query          string   `json:"query"`
	Images         []string `json:"images"`
	AttachmentName string   `json:"attachment_name"`
	AttachmentType string   `json:"attachment_type"`
	Files          []string `json:"files"`
	FileNames      []string `json:"file_names"`
	FileTypes      []string `json:"file_types"`
}

type Request struct {
	Model  string `json:"model"`
	Prompt string `json:"prompt"`
	Stream bool   `json:"stream"`
}

type ChatRequest struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
	Stream   bool      `json:"stream"`
}

type Response struct {
	Model    string `json:"model"`
	Response string `json:"response"`
	Done     bool   `json:"done"`
}

type ChatResponse struct {
	Model   string  `json:"model"`
	Message Message `json:"message"`
	Done    bool    `json:"done"`
}

type Message struct {
	Model          string   `json:"model"`
	Role           string   `json:"role"`
	Content        string   `json:"content"`
	Images         []string `json:"images"`
	AttachmentName string   `json:"attachment_name"`
	AttachmentType string   `json:"attachment_type"`
	Interrupted    bool     `json:"interrupted"`
	Files          []string `json:"files"`
	FileNames      []string `json:"file_names"`
	FileTypes      []string `json:"file_types"`
}

type Images struct {
	ImagesArray []string `json:"images_array"`
}

type Chat struct {
	Id    string `json:"id"`
	Title string `json:"title"`
}

type Chats struct {
	Chats []Chat `json:"chats"`
}

type ChatTitle struct {
	Title string `json:"title"`
}
