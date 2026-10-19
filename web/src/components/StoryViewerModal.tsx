import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Eye, Trash2, Pause, Play } from 'lucide-react';
import { Story } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

interface StoryViewerModalProps {
  stories: Story[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onStoryDeleted?: () => void;
}

const STORY_DURATION = 5000; // 5 seconds per story

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  stories,
  initialIndex,
  isOpen,
  onClose,
  onStoryDeleted,
}) => {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const [progress, setProgress] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [viewersCount, setViewersCount] = useState<number>(0);

  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const pausedProgressRef = useRef<number>(0);

  const currentStory = stories[currentIndex];

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setProgress(0);
    pausedProgressRef.current = 0;
  }, [initialIndex, isOpen]);

  // Record view in database and fetch view count
  useEffect(() => {
    if (!currentStory || !isOpen) return;

    const recordView = async () => {
      if (user && user.id !== currentStory.user_id) {
        try {
          await supabase.from('story_views').insert({
            story_id: currentStory.id,
            viewer_id: user.id,
          });
        } catch {
          // ignore unique constraint duplicates
        }
      }

      // Count viewers
      const { count } = await supabase
        .from('story_views')
        .select('*', { count: 'exact', head: true })
        .eq('story_id', currentStory.id);

      setViewersCount(count || 0);
    };

    recordView();
  }, [currentStory, isOpen, user]);

  // Timer loop for progress bar
  useEffect(() => {
    if (!isOpen || isPaused || !currentStory) return;

    startTimeRef.current = Date.now() - (pausedProgressRef.current / 100) * STORY_DURATION;

    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const currentProg = Math.min(100, (elapsed / STORY_DURATION) * 100);
      setProgress(currentProg);

      if (currentProg >= 100) {
        if (currentIndex < stories.length - 1) {
          setCurrentIndex((prev) => prev + 1);
          setProgress(0);
          pausedProgressRef.current = 0;
        } else {
          onClose();
        }
      }
    }, 40);

    timerRef.current = interval;

    return () => {
      clearInterval(interval);
    };
  }, [isOpen, isPaused, currentIndex, stories.length]);

  if (!isOpen || !currentStory) return null;

  const handlePause = () => {
    pausedProgressRef.current = progress;
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
      pausedProgressRef.current = 0;
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
      pausedProgressRef.current = 0;
    } else {
      onClose();
    }
  };

  const handleDeleteStory = async () => {
    if (!confirm('Hekayəni silmək istədiyinizə əminsiniz?')) return;
    try {
      await supabase.from('stories').delete().eq('id', currentStory.id);
      if (onStoryDeleted) onStoryDeleted();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Silinmədi');
    }
  };

  const isOwner = user?.id === currentStory.user_id;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 select-none"
      onMouseDown={handlePause}
      onMouseUp={handleResume}
      onTouchStart={handlePause}
      onTouchEnd={handleResume}
    >
      <div className="relative w-full max-w-md h-full sm:h-[86vh] bg-[#161224] sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Top Progress Bars */}
        <div className="absolute top-3 inset-x-3 z-30 flex items-center gap-1.5">
          {stories.map((s, idx) => (
            <div key={s.id} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-75"
                style={{
                  width:
                    idx < currentIndex
                      ? '100%'
                      : idx === currentIndex
                      ? `${progress}%`
                      : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Story Author Header */}
        <div className="absolute top-7 inset-x-4 z-30 flex items-center justify-between text-white drop-shadow">
          <div className="flex items-center gap-3">
            {currentStory.profiles?.avatar_url ? (
              <img
                src={currentStory.profiles.avatar_url}
                alt={currentStory.profiles.username}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-purple-500"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-purple-700 text-white font-bold flex items-center justify-center text-xs">
                {currentStory.profiles?.username ? currentStory.profiles.username.substring(0, 2).toUpperCase() : 'AZ'}
              </div>
            )}
            <div>
              <p className="text-xs font-bold leading-tight">
                @{currentStory.profiles?.username || 'user'}
              </p>
              <p className="text-[10px] text-gray-300">
                {new Date(currentStory.created_at).toLocaleTimeString('az-AZ', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isOwner && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteStory();
                }}
                className="p-1.5 rounded-full bg-black/40 hover:bg-red-900/60 text-red-300 transition-colors"
                title="Sil"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1.5 rounded-full bg-black/40 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Media Container */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
          {currentStory.media_type === 'video' ? (
            <video
              src={currentStory.media_url}
              autoPlay
              playsInline
              loop
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={currentStory.media_url}
              alt="Story"
              className="w-full h-full object-cover"
            />
          )}

          {/* Left / Right touch zones */}
          <div
            onClick={handlePrev}
            className="absolute left-0 inset-y-0 w-1/3 z-20 cursor-pointer"
          />
          <div
            onClick={handleNext}
            className="absolute right-0 inset-y-0 w-1/3 z-20 cursor-pointer"
          />
        </div>

        {/* Caption and Viewers footer */}
        <div className="absolute bottom-4 inset-x-4 z-30">
          {currentStory.caption && (
            <p className="text-sm text-white font-medium bg-black/50 backdrop-blur-sm p-3 rounded-xl mb-2">
              {currentStory.caption}
            </p>
          )}

          {isOwner && (
            <div className="flex items-center gap-2 text-xs text-white/90 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-lg w-max">
              <Eye className="w-4 h-4 text-purple-400" />
              <span>{viewersCount} baxış</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
