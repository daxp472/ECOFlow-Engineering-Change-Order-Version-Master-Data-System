import { Request, Response } from 'express';
import prisma from '../config/database';
import { hashPassword, comparePassword } from '../utils/password.utils';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.utils';
import { UserRole, UserStatus } from '@prisma/client';

// Signup
export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, role } = req.body;

    // Validation
    if (!email || !password || !name || !role) {
      res.status(400).json({
        status: 'error',
        message: 'All fields are required',
      });
      return;
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(409).json({
        status: 'error',
        message: 'User with this email already exists',
      });
      return;
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user with single role
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        roles: [role as UserRole], // Array of roles
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
        email: true,
        name: true,
        roles: true,
        status: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.roles[0], // Primary role
      roles: user.roles, // All roles
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.roles[0],
      roles: user.roles,
    });

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    res.status(201).json({
      status: 'success',
      message: 'User created successfully',
      data: {
        user,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create user',
    });
  }
};

// Login
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      res.status(400).json({
        status: 'error',
        message: 'Email and password are required',
      });
      return;
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
      });
      return;
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      res.status(403).json({
        status: 'error',
        message: 'Account is disabled',
      });
      return;
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
      });
      return;
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.roles[0], // Primary role
      roles: user.roles, // All roles
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.roles[0],
      roles: user.roles,
    });

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles,
          status: user.status,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to login',
    });
  }
};

// Refresh Token
export const refreshAccessToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        status: 'error',
        message: 'Refresh token is required',
      });
      return;
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Check if refresh token exists in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!storedToken) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid refresh token',
      });
      return;
    }

    // Check if token is expired
    if (new Date() > storedToken.expiresAt) {
      await prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });

      res.status(401).json({
        status: 'error',
        message: 'Refresh token expired',
      });
      return;
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      res.status(401).json({
        status: 'error',
        message: 'User not found or inactive',
      });
      return;
    }

    // Generate new access token
    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.roles[0],
      roles: user.roles,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({
      status: 'error',
      message: 'Invalid or expired refresh token',
    });
  }
};

// Logout
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Delete refresh token from database
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to logout',
    });
  }
};

// Get current user
export const me = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'Not authenticated',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        roles: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: 'User retrieved successfully',
      data: user,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get user',
    });
  }
};
