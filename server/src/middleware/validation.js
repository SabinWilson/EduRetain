const { z } = require('zod');

const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    // Replace with validated/parsed data
    req.body = parsed.body || req.body;
    req.query = parsed.query || req.query;
    req.params = parsed.params || req.params;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: issues,
      });
    }
    next(error);
  }
};

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Valid email is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['admin', 'mentor', 'student']),
    department: z.string().min(1, 'Department is required'),
  }),
});

const createStudentSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6).optional(),
    rollNo: z.string().min(2),
    department: z.string().min(1),
    program: z.enum(['UG', 'PG']).default('UG'),
    year: z.number().int().min(1).max(5),
    semester: z.number().int().min(1).max(10),
    mentorId: z.string().optional(),
    gender: z.enum(['Male', 'Female', 'Non-Binary', 'Other']).optional(),
  }),
});

const interventionSchema = z.object({
  body: z.object({
    studentId: z.string().min(1, 'Student ID is required'),
    type: z.enum([
      'Attendance Counselling Meeting',
      'Peer Tutoring / Remedial Classes',
      'Mentor Check-in and Engagement Nudge',
      'Academic Recovery Plan',
      'LMS Technical & Study Support',
      'General Academic Guidance',
    ]),
    description: z.string().min(3, 'Description is required'),
    recommendedBySystem: z.boolean().optional().default(false),
    targetRiskFactor: z.string().optional(),
    status: z.enum(['Planned', 'In Progress', 'Completed', 'Dismissed']).optional(),
    outcomeNotes: z.string().optional(),
  }),
});

const updateInterventionSchema = z.object({
  body: z.object({
    status: z.enum(['Planned', 'In Progress', 'Completed', 'Dismissed']).optional(),
    outcomeNotes: z.string().optional(),
    description: z.string().optional(),
  }),
});

const updateThresholdsSchema = z.object({
  body: z.object({
    lowMediumThreshold: z.number().min(0.05).max(0.90),
    mediumHighThreshold: z.number().min(0.10).max(0.95),
    emailAlertsEnabled: z.boolean().optional(),
  }),
});

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const registerSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2, 'Full name must be at least 2 characters'),
      email: z.string().trim().email('Please enter a valid institutional email address'),
      password: z.string().regex(
        passwordRegex,
        'Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, and one number'
      ),
      confirmPassword: z.string().optional(),
      role: z.enum(['student', 'mentor'], {
        errorMap: () => ({ message: 'Registration is only allowed for Student and Faculty Mentor roles' }),
      }),
      department: z.string().trim().min(1, 'Department is required'),
      rollNo: z.string().trim().optional(),
      year: z.coerce.number().int().min(1, 'Year must be between 1 and 5').max(5, 'Year must be between 1 and 5').optional(),
      semester: z.coerce.number().int().min(1, 'Semester must be between 1 and 10').max(10, 'Semester must be between 1 and 10').optional(),
      program: z.enum(['UG', 'PG']).optional().default('UG'),
    })
    .superRefine((data, ctx) => {
      if (data.confirmPassword && data.password !== data.confirmPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['confirmPassword'],
          message: 'Passwords do not match',
        });
      }
      if (data.role === 'student') {
        if (!data.rollNo || data.rollNo.trim().length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['rollNo'],
            message: 'Roll number is required for student registration',
          });
        }
        if (!data.year) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['year'],
            message: 'Academic year is required for student registration',
          });
        }
        if (!data.semester) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['semester'],
            message: 'Semester is required for student registration',
          });
        }
      }
    }),
});

module.exports = {
  validate,
  loginSchema,
  registerSchema,
  createUserSchema,
  createStudentSchema,
  interventionSchema,
  updateInterventionSchema,
  updateThresholdsSchema,
};

