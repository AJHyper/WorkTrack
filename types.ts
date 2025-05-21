// types.ts

import React, { ReactNode } from "react";
import {
  TextInput,
  TextInputProps,
  TextProps,
  TextStyle,
  TouchableOpacityProps,
  ViewStyle,
} from "react-native";

//
// 🧩 General Component Props
//

export type ScreenWrapperProps = {
  style?: ViewStyle;
  children: ReactNode;
};

export type ModalWrapperProps = {
  style?: ViewStyle;
  children: ReactNode;
  bg?: string;
};

export type TypoProps = {
  size?: number;
  color?: string;
  fontWeight?: TextStyle["fontWeight"];
  children: ReactNode;
  style?: TextStyle;
  textProps?: TextProps;
};

export type IconComponent = React.ComponentType<{
  height?: number;
  width?: number;
  strokeWidth?: number;
  color?: string;
  fill?: string;
}>;

export type IconProps = {
  name: string;
  color?: string;
  size?: number;
  strokeWidth?: number;
  fill?: string;
};

export type HeaderProps = {
  title?: string;
  style?: ViewStyle;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

export type BackButtonProps = {
  style?: ViewStyle;
  iconSize?: number;
};

//
// 👤 Authentication & User Types
//

export type UserType = {
  name?: string;
  email?: string;
  role?: string;
  mobile?: string;
  image?: string | null;
  uid?: string;
};

export interface UpdateUser {
  name?: string;
  email?: string;
  mobile?: string;
  role?: string;
  image?: string | null;
}

// Add a new type
export interface UpdateUserWithUid extends UpdateUser {
  uid: string;
}

export type ResponseType = {
  success: boolean;
  data?: any;
  msg?: string;
};

export type AuthContextType = {
  user: UserType | null;
  setUser: (user: UserType | null) => void;

  login: (email: string, password: string) => Promise<ResponseType>;

  register: (
    name: string,
    email: string,
    password: string,
    confirmPassword: string
  ) => Promise<ResponseType>;

  logout: () => void;

  updateUserData: (updatedFields: UpdateUser) => Promise<ResponseType>;
};

//
// 📅 Attendance Tracking
//

export type AttendanceEntry = {
  date: string;
  day: string;
  checkIn: string;
  checkOut?: string;
  hours?: string;
};

export type AttendanceRecord = {
  [date: string]: AttendanceEntry;
};

//
// 📁 Project Management
//

export type ProjectType = {
  id: string;
  name: string;
  description?: string;
  assignedTo: string[]; // Employee UIDs
  isActive: boolean;
};

export type ProjectContextType = {
  projects: ProjectType[];
  assignProject: (empId: string, projectId: string) => void;
  endProject: (projectId: string) => void;
  createProject: (project: Omit<ProjectType, "id" | "isActive">) => void;
};

//
// 💻 UI-Specific Props
//

export type MainLandingData = {
  totalHoursToday: string;
  checkedIn: boolean;
};

export interface CustomButtonProps extends TouchableOpacityProps {
  style?: ViewStyle;
  onPress?: () => void;
  loading?: boolean;
  children: ReactNode;
}

export interface InputProps extends TextInputProps {
  icon?: ReactNode;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  inputRef?: React.RefObject<TextInput>;
}

//
// ⚙️ Settings
//

export type SettingsType = {
  notificationsEnabled: boolean;
};
