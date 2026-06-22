"use client";

import React, { useState, useRef, ChangeEvent } from 'react';
import Image from 'next/image';
import { Camera, X, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useDispatch } from 'react-redux';
import { setUser } from '@/lib/slices/authSlice';

interface AvatarUploadProps {
  currentAvatar: string;
  onAvatarChange?: (newAvatarUrl: string) => void;
  size?: 'sm' | 'md' | 'lg';
}

const defaultAvatar = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&q=80";

const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentAvatar,
  onAvatarChange,
  size = 'md'
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dispatch = useDispatch();

  // Size classes based on the size prop with responsive design
  const sizeClasses = {
    sm: {
      container: 'h-12 w-12 sm:h-16 sm:w-16',
      icon: 'h-2.5 w-2.5 sm:h-3 sm:w-3',
      button: 'p-0.5 sm:p-1'
    },
    md: {
      container: 'h-20 w-20 sm:h-24 sm:w-24',
      icon: 'h-3 w-3 sm:h-4 sm:w-4',
      button: 'p-0.5 sm:p-1'
    },
    lg: {
      container: 'h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32',
      icon: 'h-4 w-4 sm:h-5 sm:w-5',
      button: 'p-1 sm:p-1.5 md:p-2'
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Invalid file type', {
          description: 'Please select an image file.'
        });
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File too large', {
          description: 'Please select an image smaller than 5MB.'
        });
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('avatar', selectedFile);

      const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await fetch(`${API_URL}/user/update-avatar`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        // Update avatar in state and localStorage
        if (onAvatarChange) {
          onAvatarChange(data.data.avatar);
        }

        // Update user in Redux and localStorage
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const updatedUser = {
          ...user,
          avatar: data.data.avatar
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        dispatch(setUser(updatedUser));

        toast.success('Avatar updated', {
          description: 'Your profile picture has been updated successfully.'
        });

        // Reset state
        setPreviewUrl(null);
        setSelectedFile(null);
      } else {
        toast.error('Update failed', {
          description: data.message || 'Failed to update avatar. Please try again.'
        });
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error('Upload error', {
        description: 'An error occurred while uploading your avatar. Please try again.'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const cancelUpload = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <Image
          src={previewUrl || currentAvatar || defaultAvatar}
          alt="Profile"
          className={`${sizeClasses[size].container} rounded-full object-cover border-2 border-white shadow`}
          height={size === 'lg' ? 128 : size === 'md' ? 96 : 64}
          width={size === 'lg' ? 128 : size === 'md' ? 96 : 64}
          sizes={`(max-width: 640px) ${size === 'lg' ? '96px' : size === 'md' ? '80px' : '48px'},
                 (max-width: 768px) ${size === 'lg' ? '112px' : size === 'md' ? '96px' : '64px'},
                 ${size === 'lg' ? '128px' : size === 'md' ? '96px' : '64px'}`}
        />

        {!previewUrl ? (
          <label
            htmlFor="avatar-upload"
            className={`absolute bottom-0 right-0 ${sizeClasses[size].button} bg-indigo-600 rounded-full text-white cursor-pointer hover:bg-indigo-700 transition-colors`}
            aria-label="Upload new profile picture"
          >
            <Camera className={sizeClasses[size].icon} />
          </label>
        ) : (
          <div className="absolute bottom-0 right-0 flex space-x-0.5 sm:space-x-1">
            <button
              onClick={cancelUpload}
              className={`${sizeClasses[size].button} bg-gray-600 rounded-full text-white hover:bg-gray-700 transition-colors`}
              title="Cancel"
              aria-label="Cancel upload"
            >
              <X className={sizeClasses[size].icon} />
            </button>
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className={`${sizeClasses[size].button} bg-green-600 rounded-full text-white hover:bg-green-700 transition-colors ${isUploading ? 'opacity-70' : ''}`}
              title="Save"
              aria-label="Save profile picture"
            >
              {isUploading ? (
                <Loader2 className={`${sizeClasses[size].icon} animate-spin`} />
              ) : (
                <Check className={sizeClasses[size].icon} />
              )}
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          id="avatar-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          aria-label="Upload profile picture"
        />
      </div>

      {!previewUrl && (
        <p className="text-xs sm:text-sm text-gray-500 mt-2 text-center max-w-[150px]">
          Click the camera icon to update your photo
        </p>
      )}
    </div>
  );
};

export { AvatarUpload };
