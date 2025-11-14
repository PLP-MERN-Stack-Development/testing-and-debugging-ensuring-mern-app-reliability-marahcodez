// posts.test.js - Integration tests for posts API endpoints

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../src/app');
const Post = require('../../src/models/Post');
const User = require('../../src/models/User');
const Category = require('../../src/models/Category');
const { generateToken } = require('../../src/utils/auth');

let mongoServer;
let token;
let userId;
let categoryId;
let postId;

// Setup in-memory MongoDB server before all tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Create a test user
  const user = await User.create({
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
  });
  userId = user._id;
  token = generateToken(user);

  // Create a test category
  const category = await Category.create({
    name: 'Technology',
    description: 'Tech posts',
  });
  categoryId = category._id;

  // Create a test post
  const post = await Post.create({
    title: 'Test Post',
    content: 'This is a test post content',
    author: userId,
    category: categoryId,
    slug: 'test-post',
  });
  postId = post._id;
});

// Clean up after all tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Clean up created posts between tests but keep user and category
afterEach(async () => {
  await Post.deleteMany({ _id: { $ne: postId } });
});

describe('POST /api/posts', () => {
  it('should create a new post when authenticated', async () => {
    const newPost = {
      title: 'New Test Post',
      content: 'This is a new test post content',
      category: categoryId.toString(),
    };

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send(newPost);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.post).toHaveProperty('_id');
    expect(res.body.data.post.title).toBe(newPost.title);
    expect(res.body.data.post.content).toBe(newPost.content);
  });

  it('should return 401 if not authenticated', async () => {
    const newPost = {
      title: 'Unauthorized Post',
      content: 'This should not be created',
      category: categoryId.toString(),
    };

    const res = await request(app)
      .post('/api/posts')
      .send(newPost);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return 400 if validation fails', async () => {
    const invalidPost = {
      // Missing title
      content: 'This post is missing a title',
      category: categoryId.toString(),
    };

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send(invalidPost);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Validation failed');
  });

  it('should auto-generate slug from title', async () => {
    const newPost = {
      title: 'This is a New Post',
      content: 'Post content here',
      category: categoryId.toString(),
    };

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send(newPost);

    expect(res.status).toBe(201);
    expect(res.body.data.post.slug).toBe('this-is-a-new-post');
  });
});

describe('GET /api/posts', () => {
  it('should return all posts with pagination', async () => {
    const res = await request(app).get('/api/posts');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.posts)).toBeTruthy();
    expect(res.body.data.posts.length).toBeGreaterThan(0);
    expect(res.body.data.pagination).toBeDefined();
  });

  it('should filter posts by category', async () => {
    const res = await request(app)
      .get(`/api/posts?category=${categoryId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.posts.every(post => post.category._id === categoryId.toString())).toBe(true);
  });

  it('should paginate results correctly', async () => {
    // Create multiple posts
    const posts = [];
    for (let i = 0; i < 15; i++) {
      posts.push({
        title: `Pagination Post ${i + 1}`,
        content: `Content for pagination test ${i + 1}`,
        author: userId,
        category: categoryId,
        slug: `pagination-post-${i + 1}`,
      });
    }
    await Post.insertMany(posts);

    const page1 = await request(app)
      .get('/api/posts?page=1&limit=10');
    
    const page2 = await request(app)
      .get('/api/posts?page=2&limit=10');

    expect(page1.status).toBe(200);
    expect(page2.status).toBe(200);
    expect(page1.body.data.posts.length).toBe(10);
    expect(page2.body.data.posts.length).toBeGreaterThan(0);
    expect(page1.body.data.pagination.page).toBe(1);
    expect(page2.body.data.pagination.page).toBe(2);
  });

  it('should populate author and category fields', async () => {
    const res = await request(app).get('/api/posts');

    expect(res.status).toBe(200);
    const post = res.body.data.posts[0];
    expect(post.author).toHaveProperty('username');
    expect(post.author).toHaveProperty('email');
    expect(post.category).toHaveProperty('name');
  });
});

describe('GET /api/posts/:id', () => {
  it('should return a post by ID', async () => {
    const res = await request(app)
      .get(`/api/posts/${postId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.post._id).toBe(postId.toString());
    expect(res.body.data.post.title).toBe('Test Post');
  });

  it('should increment views when fetching post', async () => {
    const initialPost = await Post.findById(postId);
    const initialViews = initialPost.views;

    await request(app).get(`/api/posts/${postId}`);
    
    const updatedPost = await Post.findById(postId);
    expect(updatedPost.views).toBe(initialViews + 1);
  });

  it('should return 404 for non-existent post', async () => {
    const nonExistentId = mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/posts/${nonExistentId}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('should return 400 for invalid ID format', async () => {
    const res = await request(app)
      .get('/api/posts/invalid-id-format');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('PUT /api/posts/:id', () => {
  it('should update a post when authenticated as author', async () => {
    const updates = {
      title: 'Updated Test Post',
      content: 'This content has been updated',
    };

    const res = await request(app)
      .put(`/api/posts/${postId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(updates);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.post.title).toBe(updates.title);
    expect(res.body.data.post.content).toBe(updates.content);
  });

  it('should return 401 if not authenticated', async () => {
    const updates = {
      title: 'Unauthorized Update',
    };

    const res = await request(app)
      .put(`/api/posts/${postId}`)
      .send(updates);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return 403 if not the author', async () => {
    // Create another user
    const anotherUser = await User.create({
      username: 'anotheruser',
      email: 'another@example.com',
      password: 'password123',
    });
    const anotherToken = generateToken(anotherUser);

    const updates = {
      title: 'Forbidden Update',
    };

    const res = await request(app)
      .put(`/api/posts/${postId}`)
      .set('Authorization', `Bearer ${anotherToken}`)
      .send(updates);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should update post status', async () => {
    const updates = {
      status: 'published',
    };

    const res = await request(app)
      .put(`/api/posts/${postId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(updates);

    expect(res.status).toBe(200);
    expect(res.body.data.post.status).toBe('published');
    expect(res.body.data.post.publishedAt).toBeDefined();
  });
});

describe('DELETE /api/posts/:id', () => {
  it('should delete a post when authenticated as author', async () => {
    // Create a new post to delete
    const tempPost = await Post.create({
      title: 'Post to Delete',
      content: 'This post will be deleted',
      author: userId,
      category: categoryId,
    });

    const res = await request(app)
      .delete(`/api/posts/${tempPost._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    
    // Verify post is deleted
    const deletedPost = await Post.findById(tempPost._id);
    expect(deletedPost).toBeNull();
  });

  it('should return 401 if not authenticated', async () => {
    const res = await request(app)
      .delete(`/api/posts/${postId}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return 404 for non-existent post', async () => {
    const nonExistentId = mongoose.Types.ObjectId();
    const res = await request(app)
      .delete(`/api/posts/${nonExistentId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/posts/:id/like', () => {
  it('should like a post when authenticated', async () => {
    const res = await request(app)
      .post(`/api/posts/${postId}/like`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isLiked).toBe(true);
    expect(res.body.data.likes).toBeGreaterThan(0);
  });

  it('should unlike a post when liked again', async () => {
    // First like
    await request(app)
      .post(`/api/posts/${postId}/like`)
      .set('Authorization', `Bearer ${token}`);

    // Second like (unlike)
    const res = await request(app)
      .post(`/api/posts/${postId}/like`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.isLiked).toBe(false);
  });

  it('should return 401 if not authenticated', async () => {
    const res = await request(app)
      .post(`/api/posts/${postId}/like`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});