export type Role = 'student' | 'instructor' | 'admin'
export type AccountStatus = 'active' | 'banned'
export type EnrollmentStatus = 'active' | 'completed' | 'dropped'
export type SubmissionStatus = 'pending' | 'submitted' | 'graded' | 'returned'

export interface Profile {
  id: string
  full_name: string | null
  role: Role
  status: AccountStatus
  avatar_url: string | null
  headline: string | null
  bio: string | null
  location: string | null
  phone: string | null
  track: string | null
  cohort: string | null
  resume_url: string | null
  gpa: number | null
  created_at: string
  updated_at: string
}

export interface Course {
  id: string
  title: string
  slug: string | null
  description: string | null
  category: string | null
  level: string | null
  cover_url: string | null
  course_link: string | null
  duration_hours: number | null
  objectives: string[] | null
  instructor_id: string | null
  published: boolean
  created_at: string
}

export interface Module {
  id: string
  course_id: string
  title: string
  position: number
}

export interface Lesson {
  id: string
  module_id: string
  title: string
  content: string | null
  video_url: string | null
  duration_minutes: number | null
  position: number
}

export interface Task {
  id: string
  course_id: string
  lesson_id?: string | null
  title: string
  description: string | null
  instructions: string | null
  max_points: number
  is_capstone: boolean
  position: number
  due_date: string | null
}

export interface Enrollment {
  id: string
  student_id: string
  course_id: string
  status: EnrollmentStatus
  enrolled_at: string
}

export interface Submission {
  id: string
  task_id: string
  student_id: string
  content: string | null
  file_url: string | null
  status: SubmissionStatus
  grade: number | null
  feedback: string | null
  graded_by: string | null
  submitted_at: string
  graded_at: string | null
}

export interface Message {
  id: string
  sender_id: string
  recipient_id: string
  course_id: string | null
  body: string
  file_url: string | null
  read: boolean
  created_at: string
}

export interface StudyGroup {
  id: string
  name: string
  description: string | null
  course_id: string | null
  schedule: string | null
  created_by: string | null
  created_at: string
}

export interface TaskQuestion {
  id: string
  task_id: string
  position: number
  question: string
  created_at: string
  options?: TaskOption[]
}

export interface TaskOption {
  id: string
  question_id: string
  position: number
  text: string
  is_correct: boolean
}

export interface StudentAnswer {
  id: string
  submission_id: string
  question_id: string
  option_id: string | null
}

export interface CapstoneEvaluation {
  id: string
  student_id: string
  course_id: string | null
  title: string
  score: number | null
  gpa: number | null
  rubric: Record<string, number> | null
  feedback: string | null
  evaluator_id: string | null
  created_at: string
}
