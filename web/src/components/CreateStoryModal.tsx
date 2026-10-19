import React, { useState } from 'react';
import { X, Image as ImageIcon, Video, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabaseClient';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryCreated: () => void;
}

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({
  isOpen,
  onClose,
  onStoryCreated,
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [caption, setCaption] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const isVid = selected.type.startsWith('video/');

      // Max 15MB for stories
      if (selected.size > 15 * 1024 * 1024) {
        setError('Fayl ölçüsü maksimum 15 MB ola bilər');
        return;
      }

      setMediaType(isVid ? 'video' : 'image');
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  const handleUploadAndPublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !file) {
      setError('Zəhmət olmasa bir şəkil və ya video seçin');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const fileExt = file.name.split('.').pop();
      const safeName = `story_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('stories')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('stories')
        .getPublicUrl(filePath);

      const finalUrl = urlData.publicUrl;

      // Expires after 24 hours
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { error: insertError } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          media_url: finalUrl,
          media_type: mediaType,
          caption: caption.trim() || null,
          expires_at: expiresAt,
        });

      if (insertError) throw insertError;

      setFile(null);
      setPreviewUrl(null);
      setCaption('');
      onStoryCreated();
      onClose();
    } catch (err: any) {
      console.error('Story upload error:', err);
      setError(err.message || 'Hekayə yüklənərkən xəta baş verdi');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#161224] border border-purple-800/40 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-purple-900/40 flex items-center justify-between">
          <h3 className="font-bold text-gray-100 flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-pink-400" /> {t('create_story_title')}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleUploadAndPublish} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-200">
              {error}
            </div>
          )}

          {/* Media Picker */}
          <div className="border-2 border-dashed border-purple-800/40 rounded-2xl p-4 text-center hover:border-purple-500 transition-colors">
            {previewUrl ? (
              <div className="relative aspect-[9/16] max-h-72 mx-auto rounded-xl overflow-hidden bg-black flex items-center justify-center">
                {mediaType === 'video' ? (
                  <video src={previewUrl} controls className="w-full h-full object-contain" />
                ) : (
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreviewUrl(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-black/70 rounded-full text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="cursor-pointer flex flex-col items-center justify-center py-10">
                <div className="flex gap-2 text-purple-400 mb-2">
                  <ImageIcon className="w-8 h-8" />
                  <Video className="w-8 h-8" />
                </div>
                <span className="text-xs font-semibold text-gray-200">
                  Şəkil və ya 24 saatlıq qısa video seçin
                </span>
                <span className="text-[11px] text-gray-400 mt-1">
                  Maksimum 15 MB (JPEG, PNG, WebP, MP4)
                </span>
                <input
                  type="file"
                  accept="image/*,video/mp4"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Hekayəyə qısa yazı əlavə edin (istəyə bağlı)..."
            className="w-full bg-[#100d1c] border border-purple-800/40 rounded-xl px-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 rounded-xl text-xs text-gray-300 hover:bg-white/5"
            >
              Ləğv et
            </button>
            <button
              type="submit"
              disabled={uploading || !file}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-900/40 disabled:opacity-50 flex items-center gap-1.5"
            >
              {uploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {uploading ? 'Yüklənir...' : t('publish')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
