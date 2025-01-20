# LocalLLM

Interact with local LLM models running in Ollama with an easy to use and familiar UI, with the possiblity of switching models during a conversation.

Home:

![image](https://github.com/user-attachments/assets/7283eb08-8714-4b96-8bfc-ec4aee409708)

Switching models during a conversation (+markdown and math-mode support):

![image](https://github.com/user-attachments/assets/cbf90518-0b2a-4896-bc81-954bab6bc6aa)

Model Switcher:

![image](https://github.com/user-attachments/assets/f436ff2f-b11f-4776-9db4-6fe17700dbbc)




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
- Support for multimodal models (Image, Speech, etc.)
- Ability to pull new models directly from within the UI
- Ability to set a default model
- Temporary Chats
- Add a lightweight LLM to generate chat titles
- Support for various screen sizes
- Dark Mode
- etc...
