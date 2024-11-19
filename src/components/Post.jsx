import React, { useState } from 'react';
import axios from 'axios';

function Post({ post, currentUser, onVote, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(post.title);
  const [editedContent, setEditedContent] = useState(post.content);

  const handleEdit = async () => {
    try {
      await axios.put(
        `http://localhost:3000/api/posts/${post.id}`,
        { title: editedTitle, content: editedContent },
        { withCredentials: true }
      );
      setIsEditing(false);
      window.location.reload();
    } catch (error) {
      console.error('Error updating post:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {isEditing ? (
        <div className="space-y-4">
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            className="w-full p-2 border rounded"
          />
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full p-2 border rounded"
            rows="4"
          />
          <div className="flex space-x-2">
            <button
              onClick={handleEdit}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold">{post.title}</h2>
              <p className="text-gray-600 text-sm">Posted by {post.username}</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onVote(post.id, 'up')}
                className="text-gray-500 hover:text-blue-500"
              >
                ▲
              </button>
              <span className="font-bold">{post.votes}</span>
              <button
                onClick={() => onVote(post.id, 'down')}
                className="text-gray-500 hover:text-red-500"
              >
                ▼
              </button>
            </div>
          </div>
          <p className="mt-4">{post.content}</p>
          {currentUser && currentUser.id === post.user_id && (
            <div className="mt-4 space-x-2">
              <button
                onClick={() => setIsEditing(true)}
                className="text-blue-500 hover:text-blue-600"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(post.id)}
                className="text-red-500 hover:text-red-600"
              >
                Delete
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}