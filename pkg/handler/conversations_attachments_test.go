package handler

import (
	"encoding/json"
	"testing"

	"github.com/korotovsky/slack-mcp-server/pkg/provider"
	"github.com/slack-go/slack"
	"github.com/stretchr/testify/assert"
)

func TestConvertMessagesFromHistory_Attachments(t *testing.T) {
	// Setup
	ch := &ConversationsHandler{}

	// Create mock users map
	usersMap := &provider.UsersCache{
		Users:    make(map[string]slack.User),
		UsersInv: make(map[string]string),
	}

	// Create a message with an image file
	slackMsg := slack.Message{
		Msg: slack.Msg{
			Timestamp: "1234567890.123456",
			User:      "U12345",
			Text:      "Here is an image",
			Files: []slack.File{
				{
					ID:                 "F12345",
					Name:               "image.png",
					Mimetype:           "image/png",
					URLPrivate:         "https://slack.com/files/image.png",
					URLPrivateDownload: "https://slack.com/files/download/image.png",
					Title:              "My Image",
				},
				{
					ID:       "F67890",
					Name:     "doc.pdf",
					Mimetype: "application/pdf", // Should be ignored or handled differently
				},
			},
		},
	}

	// Function we are testing (assuming we refactored it to take usersMap)
	// Note: We need to modify conversations.go first to make this method testable or export a helper
	// For now, let's assume we test the internal logic if we can, or the method itself if we change signature.
	// Since convertMessagesFromHistory is a method on ConversationsHandler, we can call it.
	// However, it currently calls apiProvider.ProvideUsersMap(), which we might want to dependency inject or
	// allow passing as arg. The plan said "Refactor convertMessagesFromHistory to accept *provider.UsersCache".

	messages := ch.convertMessagesFromHistory([]slack.Message{slackMsg}, "C12345", false, usersMap)

	assert.Len(t, messages, 1)
	msg := messages[0]

	assert.Equal(t, "1234567890.123456", msg.MsgID)
	assert.NotEmpty(t, msg.Images)

	// Verify JSON structure of Images
	var images []map[string]string
	err := json.Unmarshal([]byte(msg.Images), &images)
	assert.NoError(t, err)
	assert.Len(t, images, 1)
	assert.Equal(t, "https://slack.com/files/download/image.png", images[0]["url"])
	assert.Equal(t, "My Image", images[0]["title"])
	assert.Equal(t, "F12345", images[0]["id"])
}
