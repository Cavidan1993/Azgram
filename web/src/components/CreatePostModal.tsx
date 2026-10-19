import React, { useState } from 'react';
import { X, Upload, Image as ImageIcon, Loader2, Sparkles, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabaseClient';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: () => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onPostCreated,
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [caption, setCaption] = useState<string>('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);

      // Max 5 photos per post
      if (files.length + selected.length > 5) {
        setError('Bir paylaşımda maksimum 5 şəkil ola bilər');
        return;
      }

      for (const f of selected) {
        if (f.size > 8 * 1024 * 1024) {
          setError('Hər bir şəklin ölçüsü maksimum 8 MB ola bilər');
          return;
        }
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
          setError('Yalnız JPEG, PNG və WebP formatları dəstəklənir');
          return;
        }
      }

      const newPreviews = selected.map((f) => URL.createObjectURL(f));
      setFiles([...files, ...selected]);
      setPreviews([...previews, ...newPreviews]);
    }
  };

  const removeFile = (idx: number) => {
    setFiles(files.filter((_, i) => i !== idx));
    setPreviews(previews.filter((_, i) => i !== idx));
  };

  const handleUploadAndCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || files.length === 0) {
      setError('Zəhmət olmasa ən azı bir şəkil seçin');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // 1. Upload all files to Supabase Storage
      const uploadedUrls: string[] = [];

      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const safeName = `post_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${user.id}/${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(filePath, file, { cacheControl: '3600', upsert: false });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('posts')
          .getPublicUrl(filePath);

        uploadedUrls.push(urlData.publicUrl);
      }

      // 2. Insert main post
      const { data: postData, error: insertError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          image_url: uploadedUrls[0],
          caption: caption.trim() || null,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      const postId = postData.id;

      // 3. Insert into post_media for multi-images
      if (uploadedUrls.length > 1) {
        const mediaRows = uploadedUrls.map((url, sortIdx) => ({
          post_id: postId,
          media_url: url,
          media_type: 'image',
          sort_order: sortIdx,
        }));
        await supabase.from('post_media').insert(mediaRows);
      }

      // 4. Extract and link hashtags (#tag)
      const matches = caption.match(/#[a-zA-Z0-9_]+/g);
      if (matches && matches.length > 0) {
        const uniqueTags = Array.from(new Set(matches.map((m) => m.substring(1).toLowerCase())));
        for (const tag of uniqueTags) {
          try {
            // Upsert hashtag
            const { data: hashData } = await supabase
              .from('hashtags')
              .upsert({ tag }, { onConflict: 'tag' })
              .select('id')
              .single();

            if (hashData) {
              await supabase.from('post_hashtags').insert({
                post_id: postId,
                hashtag_id: hashData.id,
              });
            }
          } catch {
            // ignore duplicate links
          }
        }
      }

      // Reset
      setFiles([]);
      setPreviews([]);
      setCaption('');
      onPostCreated();
      onClose();
    } catch (err: any) {
      console.error('Post creation error:', err);
      setError(err.message || 'Paylaşım yaradılarkən xəta baş verdi');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#161224] border border-purple-800/40 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-purple-900/40 flex items-center justify-between">
          <h3 className="font-bold text-gray-100 flex items-center gap-2 text-sm">
            <Upload className="w-5 h-5 text-purple-400" /> {t('create_post_title')}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleUploadAndCreate} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-200">
              {error}
            </div>
          )}

          {/* Photos Grid & Picker */}
          {previews.length > 0 ? (
            <div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {previews.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-black group">
                    <img src={url} alt="Selected" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-red-700 rounded-full text-white transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {previews.length < 5 && (
                  <label className="border-2 border-dashed border-purple-800/40 hover:border-purple-500 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors text-purple-400">
                    <Plus className="w-6 h-6" />
                    <span className="text-[10px] text-gray-300 mt-1">Daha çox</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={handleFilesSelected}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-purple-800/40 rounded-2xl p-6 text-center hover:border-purple-500 transition-colors">
              <label className="cursor-pointer flex flex-col items-center justify-center py-6">
                <ImageIcon className="w-10 h-10 text-purple-400 mb-2" />
                <span className="text-xs font-semibold text-gray-200">
                  Şəkilləri seçin (karusel üçün 5-ə qədər)
                </span>
                <span className="text-[11px] text-gray-400 mt-1">
                  JPEG, PNG, WebP (maksimum 8 MB)
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleFilesSelected}
                  className="hidden"
                />
              </label>
            </div>
          )}

          <div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              placeholder="Təsvir yazın... #baku #azgram @dost"
              className="w-full bg-[#100d1c] border border-purple-800/40 rounded-xl p-3 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500 leading-relaxed"
            />
          </div>

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
              disabled={uploading || files.length === 0}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-purple-900/40 disabled:opacity-50 flex items-center gap-1.5"
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
