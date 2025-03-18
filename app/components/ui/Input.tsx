"use client";

import React from "react";

interface InputProps {
  id: string;
  label?: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  className?: string;
}

const Input: React.FC<InputProps> = ({
  id,
  label,
  type = "text",
  required = false,
  placeholder = "",
  value,
  onChange,
  error = "",
  className = "",
}) => {
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium leading-6 text-gray-900 mb-1"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div>
        <input
          id={id}
          name={id}
          type={type}
          autoComplete={id}
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 ${
            error ? "ring-red-500 focus:ring-red-500" : ""
          } ${className}`}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default Input;
