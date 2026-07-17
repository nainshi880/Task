import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import Button from "../../ui/Button";
import * as customerService from "../../../services/customer.service";
import { customerKeys } from "../../../lib/queryClient";

function ProfileAvatarSection({ profile }) {
  const inputRef = useRef(null);
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState(null);

  const uploadMutation = useMutation({
    mutationFn: customerService.uploadAvatar,
    onSuccess: () => {
      toast.success("Profile picture updated");
      queryClient.invalidateQueries({ queryKey: customerKeys.profile() });
      setPreview(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Upload failed");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: customerService.deleteAvatar,
    onSuccess: () => {
      toast.success("Profile picture removed");
      queryClient.invalidateQueries({ queryKey: customerKeys.profile() });
      setPreview(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Could not remove photo");
    },
  });

  const avatarUrl = preview || profile?.avatar;
  const displayName = profile?.fullName || "User";

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    uploadMutation.mutate(file);
  };

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div className="relative">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-28 w-28 rounded-full border-4 border-white object-cover shadow-md"
          />
        ) : (
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-indigo-100 text-3xl font-bold text-indigo-700 shadow-md">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-white shadow hover:bg-indigo-700"
          aria-label="Change profile picture"
        >
          <Camera size={16} />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <div className="text-center sm:text-left">
        <h2 className="text-xl font-bold text-slate-900">{displayName}</h2>
        <p className="text-sm text-slate-500">
          {profile?.user?.email || "—"}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {profile?.phone || "No phone added"}
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
          <Button
            size="sm"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            loading={uploadMutation.isPending}
          >
            Upload photo
          </Button>
          {profile?.avatar && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => deleteMutation.mutate()}
              loading={deleteMutation.isPending}
              className="text-red-600 hover:bg-red-50"
            >
              <Trash2 size={14} />
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfileAvatarSection;
