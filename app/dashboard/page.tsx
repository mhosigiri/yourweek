"use client";

import React, { Suspense, useRef, useState, useEffect } from "react";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { clearSessionCookie } from "@/lib/auth/authHelpers";
import Link from "next/link";
import NetworkStatus from "../components/ui/NetworkStatus";
import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox, Text } from "@react-three/drei";
import * as THREE from "three";

// Loading component for suspense
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-96">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

// Days of the week
const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Task type definition
interface Task {
  id: string;
  description: string;
  startTime: string;
  endTime: string;
  day: string;
}

// Interface for the task modal
interface TaskModalProps {
  day: string;
  onClose: () => void;
  onAddTask: (task: Task) => void;
  tasks: Task[];
  onDeleteTask: (id: string) => void;
}

// Modal for adding tasks
const TaskModal: React.FC<TaskModalProps> = ({ day, onClose, onAddTask, tasks, onDeleteTask }) => {
  const [newTask, setNewTask] = useState<Omit<Task, 'id'>>({
    description: "",
    startTime: "09:00",
    endTime: "10:00",
    day
  });
  
  const handleAddTask = () => {
    onAddTask({
      ...newTask,
      id: Date.now().toString(),
    });
    setNewTask({
      ...newTask,
      description: ""
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md transform transition-all">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900">{day}&apos;s Tasks</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="mb-4">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="time"
                value={newTask.startTime}
                onChange={(e) => setNewTask({...newTask, startTime: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input
                type="time"
                value={newTask.endTime}
                onChange={(e) => setNewTask({...newTask, endTime: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Task Description</label>
            <input
              type="text"
              value={newTask.description}
              onChange={(e) => setNewTask({...newTask, description: e.target.value})}
              placeholder="Enter task description"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleAddTask}
            disabled={!newTask.description.trim()}
            className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Add Task
          </button>
        </div>
        
        <div className="mt-4">
          <h4 className="font-medium text-gray-700 mb-2">Tasks for {day}</h4>
          <div className="overflow-y-auto max-h-60 border border-gray-200 rounded-md">
            {tasks.filter(task => task.day === day).length > 0 ? (
              <div className="divide-y divide-gray-200">
                {tasks
                  .filter(task => task.day === day)
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map(task => (
                    <div key={task.id} className="p-3 hover:bg-gray-50">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-900">
                          {task.startTime} - {task.endTime}
                        </span>
                        <button 
                          onClick={() => onDeleteTask(task.id)}
                          className="text-red-500 hover:text-red-700"
                          aria-label="Delete task"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      <p className="text-gray-700 mt-1">{task.description}</p>
                    </div>
                  ))
                }
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">No tasks yet for {day}</p>
            )}
          </div>
        </div>
        
        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Heptagonal Prism Face Component
interface PrismFaceProps {
  day: string;
  position: [number, number, number];
  rotation: [number, number, number];
  onClick: () => void;
  isActive: boolean;
  index: number;
  tasks: Task[];
}

const PrismFace: React.FC<PrismFaceProps> = ({ 
  day, 
  position, 
  rotation, 
  onClick, 
  isActive,
  index,
  tasks
}) => {
  const [hovered, setHovered] = useState(false);
  const faceRef = useRef<THREE.Mesh>(null);
  
  // Get task count for this day
  const taskCount = tasks.filter(task => task.day === day).length;
  
  // Day-specific theme data
  const getDayTheme = () => {
    const themes = [
      {
        // Monday - Productive Blue
        bgColor: "#bae6fd",
        hoverColor: "#7dd3fc",
        activeColor: "#0ea5e9",
        gradient: ["#dbeafe", "#e0f7ff"],
        icon: (
          <mesh position={[0, 0.25, 0.06]} rotation={[0, 0, 0]}>
            <planeGeometry args={[0.4, 0.4]} />
            <meshBasicMaterial transparent opacity={0.7} color="#0ea5e9" side={THREE.BackSide} />
            {/* Coffee cup icon simplified */}
            <Text position={[0, 0, 0.01]} fontSize={0.3} color="#0c4a6e" rotation={[0, 0, 0]}>☕</Text>
          </mesh>
        ),
        titleColor: "#075985"
      },
      {
        // Tuesday - Growth Green
        bgColor: "#bbf7d0",
        hoverColor: "#86efac",
        activeColor: "#22c55e",
        gradient: ["#d1fae5", "#dcfce7"],
        icon: (
          <mesh position={[0, 0.25, 0.06]} rotation={[0, 0, 0]}>
            <planeGeometry args={[0.4, 0.4]} />
            <meshBasicMaterial transparent opacity={0.7} color="#10b981" side={THREE.BackSide} />
            {/* Plant icon simplified */}
            <Text position={[0, 0, 0.01]} fontSize={0.3} color="#064e3b" rotation={[0, 0, 0]}>🌱</Text>
          </mesh>
        ),
        titleColor: "#047857"
      },
      {
        // Wednesday - Energy Yellow
        bgColor: "#fde68a",
        hoverColor: "#fcd34d",
        activeColor: "#eab308",
        gradient: ["#fef3c7", "#fef9c3"],
        icon: (
          <mesh position={[0, 0.25, 0.06]} rotation={[0, 0, 0]}>
            <planeGeometry args={[0.4, 0.4]} />
            <meshBasicMaterial transparent opacity={0.7} color="#fbbf24" side={THREE.BackSide} />
            {/* Lightning bolt icon simplified */}
            <Text position={[0, 0, 0.01]} fontSize={0.3} color="#78350f" rotation={[0, 0, 0]}>⚡</Text>
          </mesh>
        ),
        titleColor: "#92400e"
      },
      {
        // Thursday - Focus Red
        bgColor: "#fecaca",
        hoverColor: "#fca5a5",
        activeColor: "#ef4444",
        gradient: ["#fee2e2", "#fecaca"],
        icon: (
          <mesh position={[0, 0.25, 0.06]} rotation={[0, 0, 0]}>
            <planeGeometry args={[0.4, 0.4]} />
            <meshBasicMaterial transparent opacity={0.7} color="#ef4444" side={THREE.BackSide} />
            {/* Target icon simplified */}
            <Text position={[0, 0, 0.01]} fontSize={0.3} color="#7f1d1d" rotation={[0, 0, 0]}>🎯</Text>
          </mesh>
        ),
        titleColor: "#b91c1c"
      },
      {
        // Friday - Fun Purple with sun
        bgColor: "#e9d5ff",
        hoverColor: "#d8b4fe",
        activeColor: "#a855f7",
        gradient: ["#f3e8ff", "#ede9fe"],
        icon: (
          <mesh position={[0, 0.25, 0.06]} rotation={[0, 0, 0]}>
            <planeGeometry args={[0.4, 0.4]} />
            <meshBasicMaterial transparent opacity={0.7} color="#c084fc" side={THREE.BackSide} />
            {/* Sun icon for Friday */}
            <Text position={[0, 0, 0.01]} fontSize={0.3} color="#581c87" rotation={[0, 0, 0]}>☀️</Text>
          </mesh>
        ),
        titleColor: "#7e22ce"
      },
      {
        // Saturday - Relax Orange
        bgColor: "#fed7aa",
        hoverColor: "#fdba74",
        activeColor: "#f97316",
        gradient: ["#ffedd5", "#fed7aa"],
        icon: (
          <mesh position={[0, 0.25, 0.06]} rotation={[0, 0, 0]}>
            <planeGeometry args={[0.4, 0.4]} />
            <meshBasicMaterial transparent opacity={0.7} color="#fb923c" side={THREE.BackSide} />
            {/* Beach umbrella icon simplified */}
            <Text position={[0, 0, 0.01]} fontSize={0.3} color="#7c2d12" rotation={[0, 0, 0]}>🏖️</Text>
          </mesh>
        ),
        titleColor: "#c2410c"
      },
      {
        // Sunday - Calm Slate
        bgColor: "#e2e8f0",
        hoverColor: "#cbd5e1",
        activeColor: "#64748b",
        gradient: ["#f1f5f9", "#e2e8f0"],
        icon: (
          <mesh position={[0, 0.25, 0.06]} rotation={[0, 0, 0]}>
            <planeGeometry args={[0.4, 0.4]} />
            <meshBasicMaterial transparent opacity={0.7} color="#94a3b8" side={THREE.BackSide} />
            {/* Book icon simplified */}
            <Text position={[0, 0, 0.01]} fontSize={0.3} color="#334155" rotation={[0, 0, 0]}>📖</Text>
          </mesh>
        ),
        titleColor: "#475569"
      }
    ];
    
    return themes[index];
  };
  
  const theme = getDayTheme();
  
  // Get color based on state
  const getColor = () => {
    if (isActive) return theme.activeColor;
    if (hovered) return theme.hoverColor;
    return theme.bgColor;
  };
  
  // Using Object3D.matrixAutoUpdate ensures we get consistent transformations
  return (
    <group position={position} rotation={rotation} matrixAutoUpdate={true}>
      <mesh 
        ref={faceRef}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <RoundedBox args={[1.5, 2.2, 0.1]} radius={0.05} smoothness={4}>
          <meshStandardMaterial 
            color={getColor()} 
            roughness={0.3}
            metalness={0.2}
            side={THREE.BackSide}
          />
        </RoundedBox>
        
        {/* Day Name */}
        <Text
          position={[0, 0.85, 0.06]}
          fontSize={0.22}
          color={theme.titleColor}
          fontWeight="bold"
          anchorX="center"
          anchorY="middle"
          rotation={[0, 0, 0]}
        >
          {day}
        </Text>
        
        {/* Day decorative icon */}
        {theme.icon}
        
        {/* Task count indicator */}
        <mesh position={[0, -0.3, 0.06]}>
          <circleGeometry args={[0.22, 32]} />
          <meshBasicMaterial color={isActive ? theme.activeColor : theme.titleColor} side={THREE.BackSide} />
          <Text
            position={[0, 0, 0.01]}
            fontSize={0.2}
            color="white"
            anchorX="center"
            anchorY="middle"
            rotation={[0, 0, 0]}
            fontWeight="bold"
          >
            {taskCount}
          </Text>
        </mesh>
        
        {/* Task count label */}
        <Text
          position={[0, -0.6, 0.06]}
          fontSize={0.16}
          color={theme.titleColor}
          fontWeight="bold"
          anchorX="center"
          anchorY="middle"
          rotation={[0, 0, 0]}
        >
          {taskCount === 1 ? "task" : "tasks"}
        </Text>
        
        {isActive && (
          <mesh position={[0, -0.9, 0.06]}>
            <planeGeometry args={[1, 0.3]} />
            <meshBasicMaterial color="#3b82f6" transparent opacity={0.9} side={THREE.BackSide} />
            <Text
              position={[0, 0, 0.01]}
              fontSize={0.16}
              color="white"
              fontWeight="bold"
              anchorX="center"
              anchorY="middle"
              rotation={[0, 0, 0]}
            >
              View Tasks
            </Text>
          </mesh>
        )}
      </mesh>
    </group>
  );
};

// Heptagonal Prism 3D Component
interface PrismProps {
  currentDayIndex: number;
  onDaySelect: (day: string) => void;
  tasks: Task[];
}

const HeptagonalPrism: React.FC<PrismProps> = ({ currentDayIndex, onDaySelect, tasks }) => {
  const groupRef = useRef<THREE.Group>(null);
  const targetRotation = useRef(0);
  
  // Use React Three Fiber's animation frame hook for smoother animations
  useFrame((state) => {
    if (!groupRef.current) return;
    
    // 1. Handle the floating effect (only vertical movement)
    // Calculate a slow oscillation for a gentle floating effect
    const floatY = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    groupRef.current.position.y = floatY;
    
    // 2. Handle rotation animation - only around Y-axis
    const currentY = groupRef.current.rotation.y;
    const targetY = targetRotation.current;
    
    // Calculate the shortest path to the target rotation
    let deltaY = targetY - currentY;
    
    // Normalize the rotation to be between -PI and PI
    while (deltaY > Math.PI) deltaY -= 2 * Math.PI;
    while (deltaY < -Math.PI) deltaY += 2 * Math.PI;
    
    // Apply a smooth easing
    const step = deltaY * 0.08;
    
    // Only modify the Y rotation, leave X and Z at 0
    groupRef.current.rotation.y += step;
    
    // Ensure no unwanted rotations
    groupRef.current.rotation.x = 0;
    groupRef.current.rotation.z = 0;
  });
  
  // Set target rotation when current day changes
  useEffect(() => {
    // Calculate the target rotation angle for the current day
    // We multiply by -1 to rotate clockwise (since positive rotation is counterclockwise)
    targetRotation.current = -(currentDayIndex * (2 * Math.PI / 7));
  }, [currentDayIndex]);

  return (
    <group ref={groupRef}>
      {DAYS_OF_WEEK.map((day, index) => {
        // Calculate position and rotation for each face of the heptagonal prism
        const angle = (index * 2 * Math.PI) / 7;
        const radius = 2.5; // Distance from the center
        
        const x = radius * Math.sin(angle);
        const z = radius * Math.cos(angle);
        
        // Position in 3D space
        const position: [number, number, number] = [x, 0, z];
        
        // Set rotation to face outward from the center
        // Since we're using BackSide materials, we need to face the backs toward the viewer
        const rotationY = angle;
        
        // Ensure rotation is ONLY around Y-axis for strict direction rotation
        const rotation: [number, number, number] = [0, rotationY, 0];
        
        return (
          <PrismFace
            key={day}
            day={day}
            position={position}
            rotation={rotation}
            onClick={() => onDaySelect(day)}
            isActive={index === currentDayIndex}
            index={index}
            tasks={tasks}
          />
        );
      })}
    </group>
  );
};

// Schedule Display props interface
interface ScheduleDisplayProps {
  tasks: Task[];
}

// Schedule Display Component
const ScheduleDisplay: React.FC<ScheduleDisplayProps> = ({ tasks }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [tasksByDay, setTasksByDay] = useState<Record<string, Task[]>>({});
  
  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Organize tasks by day
  useEffect(() => {
    const now = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = dayNames[now.getDay()];
    
    // Create an object with all days as keys and empty arrays as values
    const organized: Record<string, Task[]> = {};
    DAYS_OF_WEEK.forEach(day => {
      organized[day] = [];
    });
    
    // Filter out tasks that have already ended today
    const validTasks = tasks.filter(task => {
      if (task.day !== currentDay) return true;
      
      const [hours, minutes] = task.endTime.split(':').map(Number);
      const taskEndTime = new Date();
      taskEndTime.setHours(hours, minutes, 0, 0);
      return taskEndTime > now;
    });
    
    // Organize tasks by day
    validTasks.forEach(task => {
      if (!organized[task.day]) {
        organized[task.day] = [];
      }
      organized[task.day].push(task);
    });
    
    // Sort tasks within each day by start time
    Object.keys(organized).forEach(day => {
      organized[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    
    setTasksByDay(organized);
  }, [tasks, currentTime]);
  
  // Determine if a task is currently active
  const isTaskActive = (task: Task) => {
    const now = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = dayNames[now.getDay()];
    
    if (task.day !== currentDay) return false;
    
    const [startHours, startMinutes] = task.startTime.split(':').map(Number);
    const [endHours, endMinutes] = task.endTime.split(':').map(Number);
    
    const taskStartTime = new Date();
    taskStartTime.setHours(startHours, startMinutes, 0, 0);
    
    const taskEndTime = new Date();
    taskEndTime.setHours(endHours, endMinutes, 0, 0);
    
    return now >= taskStartTime && now <= taskEndTime;
  };

  // Get the formatted date for a specific day
  const getFormattedDate = (dayName: string) => {
    const now = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayIndex = dayNames.indexOf(dayNames[now.getDay()]);
    const targetDayIndex = dayNames.indexOf(dayName);
    
    // Calculate days to add (can be negative if target day is before current day)
    let daysToAdd = targetDayIndex - currentDayIndex;
    if (daysToAdd < 0) daysToAdd += 7; // Wrap around to next week
    
    const date = new Date();
    date.setDate(now.getDate() + daysToAdd);
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
  };

  // Get day-specific theme color
  const getDayColor = (day: string) => {
    const dayIndex = DAYS_OF_WEEK.indexOf(day);
    const colors = [
      "#0ea5e9", // Monday - blue
      "#22c55e", // Tuesday - green
      "#eab308", // Wednesday - yellow
      "#ef4444", // Thursday - red
      "#a855f7", // Friday - purple
      "#f97316", // Saturday - orange
      "#64748b"  // Sunday - slate
    ];
    return colors[dayIndex] || "#3b82f6";
  };

  // Check if there are any tasks scheduled
  const hasAnyTasks = Object.values(tasksByDay).some(dayTasks => dayTasks.length > 0);

  return (
    <div className="mt-10 bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Your Upcoming Schedule</h2>
        <div className="text-gray-500 font-medium">
          {currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </div>
      </div>
      
      {hasAnyTasks ? (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {DAYS_OF_WEEK.map(day => {
                  const isCurrentDay = day === ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
                  const dayColor = getDayColor(day);
                  
                  return (
                    <th 
                      key={day} 
                      scope="col" 
                      className={`px-3 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isCurrentDay 
                          ? 'bg-blue-50 border-b-2' 
                          : 'text-gray-500 border-b'
                      }`}
                      style={{ 
                        borderBottomColor: isCurrentDay ? dayColor : undefined,
                        color: isCurrentDay ? dayColor : undefined
                      }}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">{day}</span>
                        <span className="text-xs font-normal opacity-75">{getFormattedDate(day)}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr className="divide-x divide-gray-100">
                {DAYS_OF_WEEK.map(day => {
                  const dayTasks = tasksByDay[day] || [];
                  const isEmpty = dayTasks.length === 0;
                  const dayColor = getDayColor(day);
                  
                  return (
                    <td key={day} className="px-2 py-2 align-top" style={{ minHeight: "120px" }}>
                      {isEmpty ? (
                        <div className="h-20 flex items-center justify-center text-gray-400 text-xs">
                          No tasks
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {dayTasks.map(task => {
                            const isActive = isTaskActive(task);
                            const lightColor = `${dayColor}20`;
                            
                            return (
                              <div 
                                key={task.id} 
                                className={`p-2 rounded text-xs ${
                                  isActive 
                                    ? 'border-l-2 bg-opacity-10' 
                                    : 'hover:bg-gray-50'
                                }`}
                                style={{ 
                                  backgroundColor: isActive ? lightColor : undefined,
                                  borderLeftColor: isActive ? dayColor : undefined
                                }}
                              >
                                <div className="flex justify-between items-center">
                                  <span className={`font-medium ${isActive ? 'text-gray-900' : 'text-gray-700'}`} style={{ color: isActive ? dayColor : undefined }}>
                                    {task.startTime} - {task.endTime}
                                  </span>
                                  {isActive && (
                                    <span className="text-xs font-medium px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: dayColor }}>
                                      Now
                                    </span>
                                  )}
                                </div>
                                <div className={`mt-1 text-xs ${isActive ? 'font-medium' : 'font-normal'} text-gray-600`}>
                                  {task.description}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-gray-200 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-500 mb-1">No upcoming tasks scheduled</p>
          <p className="text-gray-400 text-sm">Start by adding tasks to your week</p>
        </div>
      )}
    </div>
  );
};

// Dashboard Scene props interface
interface DashboardSceneProps {
  tasks: Task[];
  onAddTask: (task: Task) => void;
  onUpdateTask: (id: string, task: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
}

// Dashboard 3D Scene
const DashboardScene: React.FC<DashboardSceneProps> = ({ tasks, onAddTask, onDeleteTask }) => {
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  
  const rotateToPreviousDay = () => {
    setCurrentDayIndex((prev) => (prev + 1) % 7);
  };
  
  const rotateToNextDay = () => {
    setCurrentDayIndex((prev) => (prev - 1 + 7) % 7);
  };
  
  const handleDaySelect = (day: string) => {
    setSelectedDay(day);
  };
  
  const closeModal = () => {
    setSelectedDay(null);
  };

  return (
    <div className="relative">
      {/* 3D Canvas */}
      <div className="h-[500px] bg-gradient-to-b from-blue-50 to-gray-50 rounded-lg overflow-hidden shadow-xl">
        <Canvas
          camera={{ 
            position: [0, 0, 7.5], // Slightly further back to ensure we see all sides
            fov: 45,
            near: 0.1,
            far: 1000
          }}
          dpr={[1, 2]} // Responsive pixel ratio
        >
          <color attach="background" args={['#f8fafc']} />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={0.8} />
          <spotLight 
            position={[0, 10, 0]} 
            angle={0.3} 
            penumbra={1} 
            intensity={0.5} 
            castShadow 
          />
          
          <Suspense fallback={null}>
            {/* Lock rotation strictly to Y-axis only */}
            <group rotation={[0, 0, 0]}>
              {/* No PresentationControls - we'll control rotation directly */}
              <HeptagonalPrism 
                currentDayIndex={currentDayIndex}
                onDaySelect={handleDaySelect}
                tasks={tasks}
              />
            </group>
          </Suspense>
        </Canvas>
        
        {/* Navigation Controls */}
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
          <button
            onClick={rotateToNextDay}
            className="p-4 bg-white rounded-full shadow-lg hover:bg-gray-100 hover:shadow-xl transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Previous day"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
          <button
            onClick={rotateToPreviousDay}
            className="p-4 bg-white rounded-full shadow-lg hover:bg-gray-100 hover:shadow-xl transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Next day"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        {/* Current Day Indicator */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white px-6 py-3 rounded-full shadow-md">
          <div className="text-gray-800 font-semibold">{DAYS_OF_WEEK[currentDayIndex]}</div>
        </div>
      </div>
      
      {/* Task Modal */}
      {selectedDay && (
        <TaskModal
          day={selectedDay}
          onClose={closeModal}
          onAddTask={onAddTask}
          tasks={tasks}
          onDeleteTask={onDeleteTask}
        />
      )}
    </div>
  );
};

// Dashboard content component
const DashboardContent = () => {
  const { logOut } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [savedTasks, setSavedTasks] = useState<Task[]>([]);
  
  // Load tasks from localStorage on initial render
  useEffect(() => {
    const storedTasks = localStorage.getItem('yourweek_tasks');
    if (storedTasks) {
      try {
        const parsedTasks = JSON.parse(storedTasks);
        setTasks(parsedTasks);
        setSavedTasks(parsedTasks);
      } catch (e) {
        console.error('Error parsing stored tasks', e);
      }
    }
  }, []);
  
  const handleAddTask = (newTask: Task) => {
    setTasks(prev => [...prev, newTask]);
  };
  
  const handleUpdateTask = (id: string, updatedTask: Partial<Task>) => {
    setTasks(prev => prev.map(task => 
      task.id === id ? { ...task, ...updatedTask } : task
    ));
  };
  
  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id));
  };
  
  const handleSaveWeek = () => {
    // Save to localStorage
    localStorage.setItem('yourweek_tasks', JSON.stringify(tasks));
    setSavedTasks([...tasks]);
  };

  const handleLogout = async (): Promise<void> => {
    try {
      // Clear the session cookie
      clearSessionCookie();
      // Log out from Firebase
      await logOut();
      router.push("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">
            YourWeek Dashboard
          </h1>
          <div className="flex space-x-4 items-center">
            <Link
              href="/profile"
              className="text-sm font-semibold text-gray-600 hover:text-gray-900"
            >
              Profile
            </Link>
            <Link
              href="/search"
              className="text-sm font-semibold text-gray-600 hover:text-gray-900"
            >
              Search Users
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900">Weekly Planner</h2>
              <p className="mt-1 text-gray-500">Plan your week with our interactive 3D scheduler</p>
            </div>
            
            {/* 3D Heptagonal Prism Interface */}
            <div className="p-6">
              <DashboardScene 
                tasks={tasks}
                onAddTask={handleAddTask}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
              />
            </div>
            
            {/* Save Button */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <button
                onClick={handleSaveWeek}
                className="mx-auto flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-md hover:shadow-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save Week Preferences
              </button>
            </div>
            
            {/* Schedule Display */}
            {savedTasks.length > 0 && (
              <div className="p-6 border-t border-gray-200">
                <ScheduleDisplay tasks={savedTasks} />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

// Main dashboard component with suspense
export default function Dashboard(): React.ReactNode {
  return (
    <ProtectedRoute>
      <Suspense fallback={<LoadingSpinner />}>
        <DashboardContent />
        <NetworkStatus />
      </Suspense>
    </ProtectedRoute>
  );
}