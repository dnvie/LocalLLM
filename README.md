# LocalLLM

Interact with local LLM models running in Ollama with an easy to use and familiar UI, with the possiblity of switching models during a conversation.

Home:

![image](https://github.com/user-attachments/assets/6ab1a08e-27b5-4012-91e3-955bf7901296)

Switching models during a conversation (+markdown and math-mode support):

![image](https://github.com/user-attachments/assets/a736590f-958f-4fd9-8ee2-61e3f926fbd5)

Describing images with multi-modal LLMs:

![image](https://github.com/user-attachments/assets/88b22eb0-4c8b-4642-97c0-95ec70c76869)

Model switcher + chat editing:
![image](https://github.com/user-attachments/assets/4a343d12-5d1e-49a5-99c6-89fed4c18899)





---

# How to run

You need to have a local Ollama server running to use this!
Run Ollama with ```OLLAMA_HOST=0.0.0.0 ollama serve```

Enter the URL of your Ollama server (Your IP Address + ":11434") in the const `OLLAMA_SERVER` in [/backend/data/global.go](https://github.com/dnvie/LocalLLM/blob/main/backend/data/global.go).

Run the backend with `go run main.go` while in the /backend directory.

Run the frontend with `ng serve` while in the /frontend/src directory.

-----------------------------------------------------------------------------------

This is an early version and a work in progress!

Planned features:
- Ability to upload files
- User system
- Vector database for embeddings
- Ability to pull new models directly from within the UI
- Ability to set a default model
- Temporary Chats
- Add a lightweight LLM to generate chat titles
- Support for various screen sizes
- Dark Mode
- etc...
