import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Post from './Post';

function Home() {
  const [posts, setPosts] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/posts', { withCredentials: true });
      setPosts(response.data);
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  const handleVote = async (postId, voteType) => {
    try {
      await axios.post(
        `http://localhost:3000/api/posts/${postId}/vote`,
        { voteType },
        { withCredentials: true }
      );
      fetchPosts();
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const handleDelete = async (postId) => {
    try {
      await axios.delete(`http://localhost:3000/api/posts/${postId}`, { withCredentials: true });
      fetchPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  return (
    <div className="space-y-6">
      {posts.map(post => (
        <Post
          key={post.id}
          post={post}
          currentUser={user}
          onVote={handleVote}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}