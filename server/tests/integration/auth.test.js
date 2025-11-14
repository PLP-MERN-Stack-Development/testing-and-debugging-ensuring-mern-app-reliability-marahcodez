// Integration tests for auth API endpoints

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../src/app');
const User = require('../../src/models/User');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
});

describe('Auth API Endpoints', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.username).toBe(userData.username);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data).toHaveProperty('token');
    });

    it('should not allow duplicate email', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123',
      };

      // Create first user
      await request(app).post('/api/auth/register').send(userData);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...userData, username: 'differentuser' })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Email already registered');
    });

    it('should not allow duplicate username', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123',
      };

      // Create first user
      await request(app).post('/api/auth/register').send(userData);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...userData, email: 'different@example.com' })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Username already taken');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toBeDefined();
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'invalid-email',
          password: 'Password123',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should validate username length', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'ab',
          email: 'test@example.com',
          password: 'Password123',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should hash password before saving', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123',
      };

      await request(app).post('/api/auth/register').send(userData).expect(201);

      const user = await User.findOne({ email: userData.email }).select('+password');
      expect(user.password).not.toBe(userData.password);
      expect(user.password).toMatch(/^\$2[aby]\$/); // bcrypt hash pattern
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123',
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data).toHaveProperty('token');
    });

    it('should not login with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'Password123',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should not login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should not login inactive user', async () => {
      await User.updateOne({ email: 'test@example.com' }, { isActive: false });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('inactive');
    });
  });

  describe('GET /api/auth/me', () => {
    let token;
    let userId;

    beforeEach(async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123',
      });
      userId = user._id;

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123',
        });

      token = response.body.data.token;
    });

    it('should get current user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('_id');
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should not get profile without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });

    it('should not get profile with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
