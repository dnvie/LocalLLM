package rest

import (
	"net/http"

	"github.com/go-chi/chi"
	"github.com/go-chi/chi/middleware"
	"github.com/go-chi/cors"
)

func Serve() {
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"*"},
	}))

	r.Get("/models", GetModels)
	r.Get("/chats/{id}", GetChats)
	r.Get("/chat/{id}", GetChat)
	r.Get("/chat/{id}/getImages", GetImages)
	//r.Post("/query/{model}", ProcessQuery) // currently not being used
	r.Post("/chat/{model}/{id}", ProcessChat)
	r.Post("/addInterruptedMessage/{id}", AddInterruptedMessage)
	r.Patch("/chat/title/{id}", UpdateChatTitle)
	r.Delete("/chat/{id}", DeleteChat)

	http.ListenAndServe(":80", r)
}
