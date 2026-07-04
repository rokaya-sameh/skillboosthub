import {
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  Users,
  User,
  GraduationCap,
  type LucideIcon,
} from 'lucide-react'
import type { Role } from '@/lib/types'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

const studentNav: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/courses', label: 'My Courses', icon: BookOpen },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/study-groups', label: 'Study Groups', icon: Users },
  { href: '/profile', label: 'My Profile', icon: User },
]

const instructorNav: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/courses', label: 'Courses', icon: BookOpen },
  { href: '/students', label: 'Students', icon: GraduationCap },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/study-groups', label: 'Study Groups', icon: Users },
  { href: '/profile', label: 'My Profile', icon: User },
]

const adminNav: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/content', label: 'Courses & Tasks', icon: BookOpen },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/profile', label: 'My Profile', icon: User },
]

export function navForRole(role: Role): NavItem[] {
  if (role === 'admin') return adminNav
  if (role === 'instructor') return instructorNav
  return studentNav
}
