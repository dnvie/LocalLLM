package data

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"time"
)

// Initialize the database, and insert the default user.
func InitDb() {
	var err error
	Db, err = sql.Open("sqlite3", "messages.db")
	if err != nil {
		log.Fatal(err)
	}

	usersTable := `
	CREATE TABLE IF NOT EXISTS users (
		user_id TEXT PRIMARY KEY
	);`
	_, err = Db.Exec(usersTable)
	if err != nil {
		log.Fatal(err)
	}

	chatsTable := `
	CREATE TABLE IF NOT EXISTS chats (
		chat_id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL,
		title TEXT,
		FOREIGN KEY (user_id) REFERENCES users(user_id)
	);`
	_, err = Db.Exec(chatsTable)
	if err != nil {
		log.Fatal(err)
	}

	messagesTable := `
	CREATE TABLE IF NOT EXISTS messages (
		message_id INTEGER PRIMARY KEY AUTOINCREMENT,
		chat_id TEXT NOT NULL DEFAULT "",
		role TEXT NOT NULL DEFAULT "",
		content TEXT NOT NULL DEFAULT "",
		thinking TEXT NOT NULL DEFAULT "",
		model TEXT NOT NULL DEFAULT "",
		timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
		interrupted BOOLEAN NOT NULL DEFAULT FALSE,
		image TEXT NOT NULL DEFAULT "",
		attachment_name TEXT NOT NULL DEFAULT "",
		attachment_type TEXT NOT NULL DEFAULT "",
		file_names TEXT NOT NULL DEFAULT "",
		file_types TEXT NOT NULL DEFAULT "",
		FOREIGN KEY (chat_id) REFERENCES chats(chat_id)
	);`
	_, err = Db.Exec(messagesTable)
	if err != nil {
		log.Fatal(err)
	}

	// UUID: 91a91610-7998-47e2-bbcb-e6fa98d3478d is used as the default user ID, until a proper user system is implemented
	InsertDefaultUser("91a91610-7998-47e2-bbcb-e6fa98d3478d")

}

// Drop all tables in the database.
func DropTables() {
	query := `DROP TABLE IF EXISTS users;`
	_, err := Db.Exec(query)
	if err != nil {
		log.Fatal(err)
	}

	query = `DROP TABLE IF EXISTS chats;`
	_, err = Db.Exec(query)
	if err != nil {
		log.Fatal(err)
	}

	query = `DROP TABLE IF EXISTS messages;`
	_, err = Db.Exec(query)
	if err != nil {
		log.Fatal(err)
	}
}

// Insert a user into the database.
func InsertUser(userID string) error {
	query := `INSERT INTO users (user_id) VALUES (?);`
	_, err := Db.Exec(query, userID)
	if err != nil {
		log.Println("Error: ", err)
	}
	return err
}

// Insert a chat into the database.
func InsertChat(chatID, userID, title string) error {
	query := `INSERT INTO chats (chat_id, user_id, title) VALUES (?, ?, ?);`
	_, err := Db.Exec(query, chatID, userID, title)
	if err != nil {
		log.Println("Error: ", err)
	}
	return err
}

// Insert a message into the database.
func InsertMessage(chatID, role, content, thinking, model, image, attachment_name, attachment_type string, file_names, file_types []string, interrupted bool) error {
	query := `INSERT INTO messages (chat_id, role, content, thinking, model, image, attachment_name, attachment_type, file_names, file_types, interrupted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`
	jsonFileNames, err := json.Marshal(file_names)
	if err != nil {
		log.Println("Error: ", err)
		return err
	}
	jsonFileTypes, err := json.Marshal(file_types)
	if err != nil {
		log.Println("Error: ", err)
		return err
	}
	_, err2 := Db.Exec(query, chatID, role, content, thinking, model, image, attachment_name, attachment_type, jsonFileNames, jsonFileTypes, interrupted)
	if err2 != nil {
		log.Println("Error: ", err2)
	}
	return err2
}

// Update the title of a chat.
func UpdateChatTitle(chatID, title string) error {
	query := `UPDATE chats SET title = ? WHERE chat_id = ?;`
	_, err := Db.Exec(query, title, chatID)
	if err != nil {
		log.Println("Error: ", err)
		return fmt.Errorf("error updating chat title: %v", err)
	}
	return nil
}

// Delete a chat from the database.
func DeleteChat(chatID string) error {
	deleteMessagesQuery := `DELETE FROM messages WHERE chat_id = ?;`
	_, err := Db.Exec(deleteMessagesQuery, chatID)
	if err != nil {
		log.Println("Error: ", err)
		return fmt.Errorf("error deleting messages: %v", err)
	}

	deleteChatQuery := `DELETE FROM chats WHERE chat_id = ?;`
	_, err = Db.Exec(deleteChatQuery, chatID)
	if err != nil {
		log.Println("Error: ", err)
		return fmt.Errorf("error deleting chat: %v", err)
	}
	return nil
}

// Query all messages from a chat, given the chat ID.
func QueryMessagesFromChatWithoutImages(chatID string) ([]Message, error) {
	query := `SELECT role, content, thinking, model, timestamp, attachment_name, attachment_type, file_names, file_types, interrupted FROM messages WHERE chat_id = ? ORDER BY timestamp;`
	rows, err := Db.Query(query, chatID)
	if err != nil {
		log.Println("Error: ", err)
		return nil, err
	}
	defer rows.Close()

	var messages []Message
	for rows.Next() {
		var role, content, thinking, model, attachment_name, attachment_type, file_names, file_types string
		var timestamp time.Time
		var interrupted bool
		if err := rows.Scan(&role, &content, &thinking, &model, &timestamp, &attachment_name, &attachment_type, &file_names, &file_types, &interrupted); err != nil {
			log.Println("Error: ", err)
			return nil, err
		}

		var file_names_array, file_types_array []string

		err := json.Unmarshal([]byte(file_names), &file_names_array)
		if err != nil {
			if file_names == "" {
				file_names_array = []string{}
			} else {
				log.Println("Error: ", err)
				return nil, err
			}
		}

		err = json.Unmarshal([]byte(file_types), &file_types_array)
		if err != nil {
			if file_types == "" {
				file_types_array = []string{}
			} else {
				log.Println("Error: ", err)
				return nil, err
			}
		}

		messages = append(messages, Message{
			Model:          model,
			Role:           role,
			Content:        content,
			Thinking:       thinking,
			Interrupted:    interrupted,
			AttachmentName: attachment_name,
			AttachmentType: attachment_type,
			FileNames:      file_names_array,
			FileTypes:      file_types_array,
		})
	}
	return messages, nil
}

func QueryMessagesFromChat(chatID string) ([]Message, error) {
	query := `SELECT role, content, thinking,model, timestamp, image, attachment_name, attachment_type, file_names, file_types, interrupted FROM messages WHERE chat_id = ? ORDER BY timestamp;`
	rows, err := Db.Query(query, chatID)
	if err != nil {
		log.Println("Error: ", err)
		return nil, err
	}
	defer rows.Close()

	var messages []Message
	for rows.Next() {
		var role, content, thinking, model, image, attachment_name, attachment_type, file_names, file_types string
		var timestamp time.Time
		var interrupted bool
		if err := rows.Scan(&role, &content, &thinking, &model, &timestamp, &image, &attachment_name, &attachment_type, &file_names, &file_types, &interrupted); err != nil {
			log.Println("Error: ", err)
			return nil, err
		}

		var file_names_array, file_types_array []string

		err := json.Unmarshal([]byte(file_names), &file_names_array)
		if err != nil {
			if file_names == "" {
				file_names_array = []string{}
			} else {
				log.Println("Error: ", err)
				return nil, err
			}
		}

		err = json.Unmarshal([]byte(file_types), &file_types_array)
		if err != nil {
			if file_types == "" {
				file_types_array = []string{}
			} else {
				log.Println("Error: ", err)
				return nil, err
			}
		}

		messages = append(messages, Message{
			Model:          model,
			Role:           role,
			Content:        content,
			Thinking:       thinking,
			Interrupted:    interrupted,
			Images:         []string{image},
			AttachmentName: attachment_name,
			AttachmentType: attachment_type,
			FileNames:      file_names_array,
			FileTypes:      file_types_array,
		})
	}
	return messages, nil
}

// Query all chats from a user, given the user ID.
func QueryChatsFromUser(userID string) ([]Chat, error) {
	query := `SELECT chat_id, title FROM chats WHERE user_id = ?;`
	rows, err := Db.Query(query, userID)
	if err != nil {
		log.Println("Error: ", err)
		return nil, err
	}
	defer rows.Close()

	var chats []Chat
	for rows.Next() {
		var chatID, title string
		if err := rows.Scan(&chatID, &title); err != nil {
			log.Println("Error: ", err)
			return nil, err
		}

		chats = append(chats, Chat{
			Id:    chatID,
			Title: title,
		})
	}

	// Reverse the order of the chats, so that the most recent chat is at the top
	for i, j := 0, len(chats)-1; i < j; i, j = i+1, j-1 {
		chats[i], chats[j] = chats[j], chats[i]
	}

	return chats, nil
}

// Insert the default user into the database.
func InsertDefaultUser(userID string) {
	query := `INSERT OR IGNORE INTO users (user_id) VALUES (?);`

	_, err := Db.Exec(query, userID)
	if err != nil {
		log.Println("Error: ", err)
		log.Fatal(err)
	}
}

// Add an interrupted message to the database.
func AddInterruptedMessage(chatID string, message Message) error {
	query := `INSERT INTO messages (chat_id, role, content, thinking, model, image, attachment_name, attachment_type, file_names, file_types, interrupted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`
	image, err2 := json.Marshal([]string{})
	if err2 != nil {
		return err2
	}
	file_names := image
	file_types := image
	_, err := Db.Exec(query, chatID, message.Role, message.Content, message.Thinking, message.Model, image, "", "", file_names, file_types, message.Interrupted)
	if err != nil {
		log.Println("Error: ", err)
	}
	return err
}

// Retrieve stored thumbnails for images sent in a chat.
func GetImagesFromChat(chatID string) (Images, error) {
	query := `SELECT image FROM messages WHERE image != "" AND chat_id = ? ORDER BY timestamp`

	var images Images
	rows, err := Db.Query(query, chatID)
	if err != nil {
		log.Println("Error: ", err)
		return images, err
	}
	defer rows.Close()

	for rows.Next() {
		var image string
		if err := rows.Scan(&image); err != nil {
			log.Println("Error: ", err)
			return images, err
		}

		images.ImagesArray = append(images.ImagesArray, image)
	}
	return images, nil
}
