"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, requireRole } from "@/lib/auth";
import type {
  CapstoneEvaluation,
  Course,
  Enrollment,
  Message,
  Profile,
  StudyGroup,
  Submission,
  Task,
  Module,
  Lesson,
  TaskOption,
  TaskQuestion,
} from "@/lib/types";

export type StudentDashboardData = {
  enrollments: (Enrollment & {
    course: Pick<Course, "id" | "title" | "category" | "level"> | null;
  })[];
  submissions: Pick<Submission, "id" | "status" | "grade">[];
  completedLessons: number;
};

export async function getStudentDashboardData(
  studentId: string,
): Promise<StudentDashboardData> {
  const profile = await requireProfile();
  if (profile.id !== studentId && profile.role !== "admin")
    throw new Error("Unauthorized");

  const supabase = await createClient();
  const [
    { data: enrollments },
    { data: submissions },
    { count: completedLessons },
  ] = await Promise.all([
    supabase
      .from("enrollments")
      .select("id, status, course:courses(id, title, category, level)")
      .eq("student_id", studentId),
    supabase
      .from("submissions")
      .select("id, status, grade")
      .eq("student_id", studentId),
    supabase
      .from("lesson_progress")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("completed", true),
  ]);

  const normalizedEnrollments = (
    (enrollments ?? []) as (Enrollment & {
      course:
        | Pick<Course, "id" | "title" | "category" | "level">
        | Pick<Course, "id" | "title" | "category" | "level">[]
        | null;
    })[]
  ).map((enrollment) => ({
    ...enrollment,
    course: Array.isArray(enrollment.course)
      ? (enrollment.course[0] ?? null)
      : enrollment.course,
  }));

  return {
    enrollments: normalizedEnrollments,
    submissions:
      (submissions as Pick<Submission, "id" | "status" | "grade">[]) ?? [],
    completedLessons: completedLessons ?? 0,
  };
}

export type InstructorSubmissionPreview = Pick<
  Submission,
  "id" | "status" | "submitted_at"
> & {
  student: { full_name: string | null } | null;
  task: { title: string; course_id: string } | null;
};

export async function getInstructorDashboardData(instructorId: string) {
  const profile = await requireRole(["instructor", "admin"]);
  if (profile.id !== instructorId && profile.role !== "admin")
    throw new Error("Unauthorized");

  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, published")
    .eq("instructor_id", instructorId);

  const courseIds = (
    (courses as Pick<Course, "id" | "title" | "published">[]) ?? []
  ).map((course) => course.id);

  const [{ count: enrolledCount }, { data: pending }] = await Promise.all([
    courseIds.length
      ? supabase
          .from("enrollments")
          .select("id", { count: "exact", head: true })
          .in("course_id", courseIds)
      : Promise.resolve({ count: 0 }),
    supabase
      .from("submissions")
      .select(
        "id, status, submitted_at, student:profiles!submissions_student_id_fkey(full_name), task:tasks(title, course_id)",
      )
      .neq("status", "graded")
      .order("submitted_at", { ascending: true })
      .limit(8),
  ]);

  const pendingForInstructor = (
    (pending ?? []) as (Pick<Submission, "id" | "status" | "submitted_at"> & {
      student:
        | { full_name: string | null }
        | { full_name: string | null }[]
        | null;
      task:
        | { title: string; course_id: string }
        | { title: string; course_id: string }[]
        | null;
    })[]
  )
    .map((submission) => ({
      ...submission,
      student: Array.isArray(submission.student)
        ? (submission.student[0] ?? null)
        : submission.student,
      task: Array.isArray(submission.task)
        ? (submission.task[0] ?? null)
        : submission.task,
    }))
    .filter(
      (submission) =>
        submission.task && courseIds.includes(submission.task.course_id),
    );

  return {
    courses: (courses as Pick<Course, "id" | "title" | "published">[]) ?? [],
    enrolledCount: enrolledCount ?? 0,
    pending: pendingForInstructor,
  };
}

export async function getAdminDashboardData() {
  await requireRole(["admin"]);
  const admin = createAdminClient();

  const [
    { data: roleRows },
    { count: courses },
    { count: enrollments },
    { count: submissions },
    { count: pending },
  ] = await Promise.all([
    admin.from("profiles").select("role, status"),
    admin.from("courses").select("id", { count: "exact", head: true }),
    admin.from("enrollments").select("id", { count: "exact", head: true }),
    admin.from("submissions").select("id", { count: "exact", head: true }),
    admin
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .neq("status", "graded"),
  ]);

  const rows = (roleRows as Pick<Profile, "role" | "status">[]) ?? [];

  return {
    totalUsers: rows.length,
    banned: rows.filter((row) => row.status === "banned").length,
    courses: courses ?? 0,
    enrollments: enrollments ?? 0,
    submissions: submissions ?? 0,
    pending: pending ?? 0,
  };
}

export async function getCoursesCatalog() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [coursesRes, enrollmentsRes] = await Promise.all([
    supabase
      .from("courses")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false }),
    supabase.from("enrollments").select("*").eq("student_id", profile.id),
  ]);

  return {
    profile,
    courses: (coursesRes.data as Course[]) ?? [],
    enrollments: (enrollmentsRes.data as Enrollment[]) ?? [],
  };
}

export type InstructorCourseData = {
  course: Course | null;
  modules: Module[];
  lessons: Lesson[];
  tasks: Task[];
  enrolledCount: number;
  submissions: (Submission & {
    student: { full_name: string | null } | null;
  })[];
};

export type StudentCourseData = {
  course: Course | null;
  modules: Module[];
  lessons: Lesson[];
  tasks: (Task & { questions: (TaskQuestion & { options: TaskOption[] })[] })[];
  completedLessonIds: string[];
  submissions: Submission[];
};

export async function getInstructorCourseData(
  courseId: string,
): Promise<InstructorCourseData> {
  await requireRole(["instructor", "admin"]);
  const admin = createAdminClient();

  const { data: course } = await admin
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .single();
  if (!course) {
    return {
      course: null,
      modules: [],
      lessons: [],
      tasks: [],
      enrolledCount: 0,
      submissions: [],
    };
  }

  const [
    { data: modules },
    { data: lessons },
    { data: tasks },
    { count: enrolledCount },
  ] = await Promise.all([
    admin
      .from("modules")
      .select("*")
      .eq("course_id", courseId)
      .order("position"),
    admin
      .from("lessons")
      .select("*, modules!inner(course_id)")
      .eq("modules.course_id", courseId)
      .order("position"),
    admin.from("tasks").select("*").eq("course_id", courseId).order("position"),
    admin
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .eq("course_id", courseId),
  ]);

  const taskIds = ((tasks as Task[]) ?? []).map((task) => task.id);
  const { data: submissions } = taskIds.length
    ? await admin
        .from("submissions")
        .select("*, student:profiles!submissions_student_id_fkey(full_name)")
        .in("task_id", taskIds)
    : { data: [] };

  return {
    course: course as Course,
    modules: (modules as Module[]) ?? [],
    lessons: ((lessons as (Lesson & { modules?: unknown })[]) ?? []).map(
      ({ modules: _modules, ...lesson }) => lesson,
    ),
    tasks: (tasks as Task[]) ?? [],
    enrolledCount: enrolledCount ?? 0,
    submissions: (
      (submissions ?? []) as (Submission & {
        student:
          | { full_name: string | null }
          | { full_name: string | null }[]
          | null;
      })[]
    ).map((submission) => ({
      ...submission,
      student: Array.isArray(submission.student)
        ? (submission.student[0] ?? null)
        : submission.student,
    })),
  };
}

export async function getStudentCourseData(
  courseId: string,
): Promise<StudentCourseData> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .single();
  if (!course) {
    return {
      course: null,
      modules: [],
      lessons: [],
      tasks: [],
      completedLessonIds: [],
      submissions: [],
    };
  }

  const [
    modulesRes,
    lessonsRes,
    tasksRes,
    questionsRes,
    progressRes,
    submissionsRes,
  ] = await Promise.all([
    supabase
      .from("modules")
      .select("*")
      .eq("course_id", courseId)
      .order("position"),
    supabase
      .from("lessons")
      .select("*, modules!inner(course_id)")
      .eq("modules.course_id", courseId)
      .order("position"),
    supabase
      .from("tasks")
      .select("*")
      .eq("course_id", courseId)
      .order("position"),
    supabase
      .from("task_questions")
      .select("*, tasks!inner(course_id)")
      .eq("tasks.course_id", courseId)
      .order("position"),
    supabase
      .from("lesson_progress")
      .select("lesson_id, completed")
      .eq("student_id", profile.id),
    supabase.from("submissions").select("*").eq("student_id", profile.id),
  ]);

  const questionRows =
    (questionsRes.data as (TaskQuestion & { tasks?: unknown })[]) ?? [];
  const questionIds = questionRows.map((question) => question.id);
  const { data: options } = questionIds.length
    ? await supabase
        .from("task_options")
        .select("*")
        .in("question_id", questionIds)
        .order("position")
    : { data: [] };

  const optsByQuestion = new Map<string, TaskOption[]>();
  for (const option of (options as TaskOption[]) ?? []) {
    const existing = optsByQuestion.get(option.question_id) ?? [];
    existing.push(option);
    optsByQuestion.set(option.question_id, existing);
  }

  const questionsByTask = new Map<
    string,
    (TaskQuestion & { options: TaskOption[] })[]
  >();
  for (const question of questionRows) {
    const { tasks: _tasks, ...cleanQuestion } = question;
    const full = {
      ...cleanQuestion,
      options: optsByQuestion.get(cleanQuestion.id) ?? [],
    };
    const existing = questionsByTask.get(cleanQuestion.task_id) ?? [];
    existing.push(full);
    questionsByTask.set(cleanQuestion.task_id, existing);
  }

  return {
    course: course as Course,
    modules: (modulesRes.data as Module[]) ?? [],
    lessons: (
      (lessonsRes.data as (Lesson & { modules?: unknown })[]) ?? []
    ).map(({ modules: _modules, ...lesson }) => lesson),
    tasks: ((tasksRes.data as Task[]) ?? []).map((task) => ({
      ...task,
      questions: questionsByTask.get(task.id) ?? [],
    })),
    completedLessonIds: (
      (progressRes.data as { lesson_id: string; completed: boolean }[]) ?? []
    )
      .filter((progress) => progress.completed)
      .map((progress) => progress.lesson_id),
    submissions: (submissionsRes.data as Submission[]) ?? [],
  };
}

export async function getStudentsIndex() {
  await requireRole(["instructor", "admin"]);
  const admin = createAdminClient();

  const [{ data: students }, { data: submissions }] = await Promise.all([
    admin.from("profiles").select("*").eq("role", "student").order("full_name"),
    admin.from("submissions").select("student_id, status, grade"),
  ]);

  return {
    students: (students as Profile[]) ?? [],
    submissions:
      (submissions as {
        student_id: string;
        status: string;
        grade: number | null;
      }[]) ?? [],
  };
}

export async function getStudentDetail(studentId: string) {
  await requireRole(["instructor", "admin"]);
  const admin = createAdminClient();

  const { data: student } = await admin
    .from("profiles")
    .select("*")
    .eq("id", studentId)
    .single();
  if (!student || (student as Profile).role !== "student") {
    return null;
  }

  const [subsRes, coursesRes, evalsRes] = await Promise.all([
    admin
      .from("submissions")
      .select("*, tasks(title, max_points, course_id)")
      .eq("student_id", studentId)
      .order("submitted_at", { ascending: false }),
    admin.from("courses").select("id, title").eq("published", true),
    admin
      .from("capstone_evaluations")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false }),
  ]);

  return {
    student: student as Profile,
    submissions:
      (subsRes.data as (Submission & {
        tasks: { title: string; max_points: number; course_id: string };
      })[]) ?? [],
    courses: (coursesRes.data as Pick<Course, "id" | "title">[]) ?? [],
    evaluations: (evalsRes.data as CapstoneEvaluation[]) ?? [],
  };
}

export async function getUserProfileDetail(userId: string) {
  const viewer = await requireProfile();
  const admin = createAdminClient();
  const supabase = await createClient();

  const { data: user } = await admin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (!user) return null;

  const target = user as Profile;
  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .or(
      `and(sender_id.eq.${viewer.id},recipient_id.eq.${target.id}),and(sender_id.eq.${target.id},recipient_id.eq.${viewer.id})`,
    )
    .order("created_at", { ascending: true });

  if (target.role === "student") {
    const [submissionsRes, evalsRes] = await Promise.all([
      admin
        .from("submissions")
        .select("id, status, grade")
        .eq("student_id", target.id),
      admin
        .from("capstone_evaluations")
        .select("id, score, gpa")
        .eq("student_id", target.id),
    ]);
    const submissions =
      (submissionsRes.data as Pick<Submission, "id" | "status" | "grade">[]) ??
      [];
    const graded = submissions.filter(
      (submission) => submission.status === "graded",
    ).length;
    const pending = submissions.filter(
      (submission) => submission.status === "submitted",
    ).length;
    const gradedWithScore = submissions.filter(
      (submission) => submission.grade != null,
    );
    const averageGrade = gradedWithScore.length
      ? Math.round(
          gradedWithScore.reduce(
            (total, submission) => total + Number(submission.grade),
            0,
          ) / gradedWithScore.length,
        )
      : null;

    return {
      viewer,
      user: target,
      messages: (messages as Message[]) ?? [],
      stats: {
        submissions: submissions.length,
        graded,
        pending,
        averageGrade,
        evaluations: evalsRes.data?.length ?? 0,
      },
    };
  }

  if (target.role === "instructor") {
    const { data: courses } = await admin
      .from("courses")
      .select("id, title, published")
      .eq("instructor_id", target.id)
      .order("created_at", { ascending: false });
    const courseIds = (
      (courses as Pick<Course, "id" | "title" | "published">[]) ?? []
    ).map((course) => course.id);
    const { count: enrolledStudents } = courseIds.length
      ? await admin
          .from("enrollments")
          .select("id", { count: "exact", head: true })
          .in("course_id", courseIds)
      : { count: 0 };

    return {
      viewer,
      user: target,
      messages: (messages as Message[]) ?? [],
      stats: {
        courses: courseIds.length,
        publishedCourses: (
          (courses as Pick<Course, "published">[]) ?? []
        ).filter((course) => course.published).length,
        enrolledStudents: enrolledStudents ?? 0,
      },
    };
  }

  return {
    viewer,
    user: target,
    messages: (messages as Message[]) ?? [],
    stats: {
      role: target.role,
      status: target.status,
    },
  };
}

export async function getMessagesOverview() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .or(`sender_id.eq.${profile.id},recipient_id.eq.${profile.id}`)
    .order("created_at", { ascending: false });

  const msgs = (messages as Message[]) ?? [];
  const threads = new Map<string, { last: Message; unread: number }>();
  for (const message of msgs) {
    const other =
      message.sender_id === profile.id
        ? message.recipient_id
        : message.sender_id;
    const entry = threads.get(other);
    const unreadInc =
      message.recipient_id === profile.id && !message.read ? 1 : 0;
    if (!entry) threads.set(other, { last: message, unread: unreadInc });
    else entry.unread += unreadInc;
  }

  const otherIds = Array.from(threads.keys());
  const { data: people } = otherIds.length
    ? await admin
        .from("profiles")
        .select("id, full_name, role, avatar_url")
        .in("id", otherIds)
    : {
        data: [] as Pick<Profile, "id" | "full_name" | "role" | "avatar_url">[],
      };

  const { data: contacts } = await admin
    .from("profiles")
    .select("id, full_name, role, avatar_url")
    .neq("id", profile.id)
    .eq("status", "active")
    .order("full_name")
    .limit(100);

  return {
    profile,
    messages: msgs,
    threads: otherIds.map((id) => ({ id, ...threads.get(id)! })),
    people:
      (people as Pick<Profile, "id" | "full_name" | "role" | "avatar_url">[]) ??
      [],
    contacts:
      (contacts as Pick<
        Profile,
        "id" | "full_name" | "role" | "avatar_url"
      >[]) ?? [],
  };
}

export async function getStudyGroups() {
  await requireProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("study_groups")
    .select("*, study_group_members(count)")
    .order("created_at", { ascending: false });

  return (
    (data as (StudyGroup & { study_group_members: { count: number }[] })[]) ??
    []
  );
}

export type GroupNote = {
  id: string;
  title: string;
  file_url: string;
  created_at: string;
  profiles: { full_name: string | null } | null;
};

export async function getStudyGroupDetail(groupId: string) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: group } = await supabase
    .from("study_groups")
    .select("*")
    .eq("id", groupId)
    .single();
  if (!group) return null;

  const today = new Date().toISOString().slice(0, 10);
  const [memberRes, notesRes, attendanceRes, todayRes] = await Promise.all([
    supabase
      .from("study_group_members")
      .select("student_id")
      .eq("group_id", groupId)
      .eq("student_id", profile.id)
      .maybeSingle(),
    supabase
      .from("group_notes")
      .select("*, profiles(full_name)")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false }),
    supabase
      .from("group_attendance")
      .select("session_date")
      .eq("group_id", groupId)
      .eq("student_id", profile.id),
    supabase
      .from("group_attendance")
      .select("student_id")
      .eq("group_id", groupId)
      .eq("student_id", profile.id)
      .eq("session_date", today)
      .maybeSingle(),
  ]);

  return {
    group: group as StudyGroup,
    isMember: !!memberRes.data,
    attendedToday: !!todayRes.data,
    attendanceCount: attendanceRes.data?.length ?? 0,
    notes: (notesRes.data as GroupNote[]) ?? [],
  };
}
