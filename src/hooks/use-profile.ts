import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getUser, setUser } from "@/lib/storage";
import type { AuthenticatedUser } from "@/types/auth";

type UploadProfilePicResponse = {
  message?: string;
  data?: {
    profile_pic_url?: string;
    url?: string;
  };
  profile_pic_url?: string;
};

type UpdateProfileResponse = {
  message?: string;
  data?: AuthenticatedUser;
};

export function useFetchUserProfile() {
  return useQuery<AuthenticatedUser | null>({
    queryKey: ["user-profile"],
    queryFn: async () => {
      try {
        const { data } = await api.get<{ data: AuthenticatedUser }>("/users/me");
        if (data?.data) {
          const currentUser = await getUser<AuthenticatedUser>();
          const updated = { ...currentUser, ...data.data };
          await setUser(updated);
          return updated;
        }
      } catch (err) {
        console.warn("Failed to fetch fresh user profile from API, fallback to storage", err);
      }
      return getUser<AuthenticatedUser>();
    },
  });
}

export function useUploadProfilePic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: { uri: string; name?: string; type?: string }) => {
      const formData = new FormData();
      const filename = file.name || "profile.jpg";
      const match = /\.([a-zA-Z0-9]+)$/.exec(filename);
      const fileType = file.type || (match ? `image/${match[1]}` : "image/jpeg");

      formData.append("file", {
        uri: file.uri,
        name: filename,
        type: fileType,
      } as unknown as Blob);

      // Try POST /users/me/profile-pic endpoint
      try {
        const { data } = await api.post<UploadProfilePicResponse>(
          "/users/me/profile-pic",
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        return data;
      } catch {
        // Fallback endpoint POST /users/profile-pic
        const { data } = await api.post<UploadProfilePicResponse>(
          "/users/profile-pic",
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        return data;
      }
    },
    onSuccess: async (data, file) => {
      const newUrl = data?.data?.profile_pic_url || data?.data?.url || data?.profile_pic_url || file.uri;
      const currentUser = await getUser<AuthenticatedUser>();

      if (currentUser) {
        const updatedUser = {
          ...currentUser,
          profile_pic_url: newUrl,
        };
        await setUser(updatedUser);
      }

      void queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      void queryClient.invalidateQueries({ queryKey: ["direct-chats"] });
      void queryClient.invalidateQueries({ queryKey: ["group-chats"] });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, uuid }: { name: string; uuid?: string }) => {
      try {
        const { data } = await api.patch<UpdateProfileResponse>(`/users/${uuid || 'me'}`, { name });
        return data;
      } catch {
        const { data } = await api.put<UpdateProfileResponse>("/users/me", { name });
        return data;
      }
    },
    onSuccess: async (_data, { name }) => {
      const currentUser = await getUser<AuthenticatedUser>();
      if (currentUser) {
        const updatedUser = { ...currentUser, name };
        await setUser(updatedUser);
      }

      void queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      void queryClient.invalidateQueries({ queryKey: ["direct-chats"] });
    },
  });
}
