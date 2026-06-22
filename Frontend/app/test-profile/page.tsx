"use client";

import React, { useState } from 'react';
import { AvatarUpload } from '@/components/ui/avatar-upload';
import { useSelector } from 'react-redux';

interface RootState {
  auth: {
    user: any;
  };
}

const TestProfilePage: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const [avatar, setAvatar] = useState(user?.avatar || "");

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-2xl font-bold mb-6">Profile Image Upload Test</h1>
          
          <div className="flex flex-col items-center space-y-8">
            <div>
              <h2 className="text-lg font-medium mb-4">Small Avatar</h2>
              <AvatarUpload 
                currentAvatar={avatar} 
                onAvatarChange={setAvatar}
                size="sm" 
              />
            </div>
            
            <div>
              <h2 className="text-lg font-medium mb-4">Medium Avatar</h2>
              <AvatarUpload 
                currentAvatar={avatar} 
                onAvatarChange={setAvatar}
                size="md" 
              />
            </div>
            
            <div>
              <h2 className="text-lg font-medium mb-4">Large Avatar</h2>
              <AvatarUpload 
                currentAvatar={avatar} 
                onAvatarChange={setAvatar}
                size="lg" 
              />
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">Current Avatar URL:</h3>
            <p className="text-sm break-all">{avatar || "No avatar set"}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestProfilePage;
