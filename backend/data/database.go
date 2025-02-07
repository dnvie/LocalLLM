package data

import (
	"database/sql"
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
		chat_id TEXT NOT NULL,
		role TEXT NOT NULL,
		content TEXT NOT NULL,
		model TEXT,
		timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
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
	return err
}

// Insert a chat into the database.
func InsertChat(chatID, userID, title string) error {
	query := `INSERT INTO chats (chat_id, user_id, title) VALUES (?, ?, ?);`
	_, err := Db.Exec(query, chatID, userID, title)
	return err
}

// Insert a message into the database.
func InsertMessage(chatID, role, content, model string) error {
	query := `INSERT INTO messages (chat_id, role, content, model) VALUES (?, ?, ?, ?);`
	_, err := Db.Exec(query, chatID, role, content, model)
	return err
}

// Update the title of a chat.
func UpdateChatTitle(chatID, title string) error {
	query := `UPDATE chats SET title = ? WHERE chat_id = ?;`
	_, err := Db.Exec(query, title, chatID)
	if err != nil {
		return fmt.Errorf("error updating chat title: %v", err)
	}
	return nil
}

// Delete a chat from the database.
func DeleteChat(chatID string) error {
	deleteMessagesQuery := `DELETE FROM messages WHERE chat_id = ?;`
	_, err := Db.Exec(deleteMessagesQuery, chatID)
	if err != nil {
		return fmt.Errorf("error deleting messages: %v", err)
	}

	deleteChatQuery := `DELETE FROM chats WHERE chat_id = ?;`
	_, err = Db.Exec(deleteChatQuery, chatID)
	if err != nil {
		return fmt.Errorf("error deleting chat: %v", err)
	}
	return nil
}

// Query all messages from a chat, given the chat ID.
func QueryMessagesFromChat(chatID string) ([]Message, error) {
	query := `SELECT role, content, model, timestamp FROM messages WHERE chat_id = ? ORDER BY timestamp;`
	rows, err := Db.Query(query, chatID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []Message
	for rows.Next() {
		var role, content, model string
		var timestamp time.Time
		if err := rows.Scan(&role, &content, &model, &timestamp); err != nil {
			return nil, err
		}

		messages = append(messages, Message{
			Model:   model,
			Role:    role,
			Content: content,
		})
	}

	return messages, nil
}

// Query all chats from a user, given the user ID.
func QueryChatsFromUser(userID string) ([]Chat, error) {
	query := `SELECT chat_id, title FROM chats WHERE user_id = ?;`
	rows, err := Db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var chats []Chat
	for rows.Next() {
		var chatID, title string
		if err := rows.Scan(&chatID, &title); err != nil {
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
		log.Fatal(err)
	}
}
