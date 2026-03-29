import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { TopBar } from "@/components/TopBar";
import { AppCard } from "@/components/ui/AppCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { colors, radius, spacing } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/store/useAppStore";

interface Post {
  id: string;
  user_id: string;
  author_name: string;
  is_anonymous: boolean;
  text: string;
  created_at: string;
  likes: number;
  userLiked: boolean;
  commentsCount: number;
}

interface Comment {
  id: string;
  user_id: string;
  author_name: string;
  is_anonymous: boolean;
  text: string;
  created_at: string;
}

export default function CommunityScreen() {
  const { t } = useTranslation();
  const user = useAppStore((s) => s.user);
  const profile = useAppStore((s) => s.profile);

  const [posts, setPosts] = useState<Post[]>([]);
  const [draft, setDraft] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [loading, setLoading] = useState(true);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentDraft, setCommentDraft] = useState("");

  const userId = user?.id;
  const displayName = profile?.fullName || "User";

  const fetchPosts = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const { data: postsData, error } = await supabase
        .from("community_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!postsData) {
        setLoading(false);
        return;
      }

      const postIds = postsData.map((p) => p.id);

      const [{ data: reactions }, { data: commentRows }] = await Promise.all([
        supabase
          .from("community_reactions")
          .select("post_id, user_id")
          .in("post_id", postIds.length ? postIds : [""]),
        supabase
          .from("community_comments")
          .select("post_id")
          .in("post_id", postIds.length ? postIds : [""])
      ]);

      const mapped: Post[] = postsData.map((p) => ({
        id: p.id,
        user_id: p.user_id,
        author_name: p.author_name,
        is_anonymous: p.is_anonymous,
        text: p.text,
        created_at: p.created_at,
        likes: reactions?.filter((r) => r.post_id === p.id).length ?? 0,
        userLiked: reactions?.some((r) => r.post_id === p.id && r.user_id === userId) ?? false,
        commentsCount: commentRows?.filter((c) => c.post_id === p.id).length ?? 0
      }));

      setPosts(mapped);
    } catch {
      // Tables might not exist yet — stay on empty state
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const submitPost = async () => {
    if (!draft.trim() || !userId) return;

    const { error } = await supabase.from("community_posts").insert({
      user_id: userId,
      author_name: isAnonymous ? "Anonymous" : displayName,
      is_anonymous: isAnonymous,
      text: draft.trim()
    });

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    setDraft("");
    fetchPosts();
  };

  const toggleLike = async (postId: string, currentlyLiked: boolean) => {
    if (!userId) return;

    if (currentlyLiked) {
      await supabase.from("community_reactions").delete().eq("post_id", postId).eq("user_id", userId);
    } else {
      await supabase.from("community_reactions").insert({ post_id: postId, user_id: userId });
    }

    fetchPosts();
  };

  const fetchComments = async (postId: string) => {
    const { data } = await supabase
      .from("community_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (data) {
      setComments((prev) => ({ ...prev, [postId]: data }));
    }
  };

  const toggleExpand = (postId: string) => {
    if (expandedPost === postId) {
      setExpandedPost(null);
    } else {
      setExpandedPost(postId);
      fetchComments(postId);
    }
    setCommentDraft("");
  };

  const submitComment = async (postId: string) => {
    if (!commentDraft.trim() || !userId) return;

    await supabase.from("community_comments").insert({
      post_id: postId,
      user_id: userId,
      author_name: isAnonymous ? "Anonymous" : displayName,
      is_anonymous: isAnonymous,
      text: commentDraft.trim()
    });

    setCommentDraft("");
    fetchComments(postId);
    fetchPosts();
  };

  const deletePost = async (postId: string) => {
    if (!userId) return;

    Alert.alert(t("communityDeletePostTitle"), t("communityDeletePostMsg"), [
      { text: t("back"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          await supabase.from("community_reactions").delete().eq("post_id", postId);
          await supabase.from("community_comments").delete().eq("post_id", postId);
          const { error } = await supabase.from("community_posts").delete().eq("id", postId).eq("user_id", userId);

          if (error) {
            Alert.alert("Error", error.message);
            return;
          }

          if (expandedPost === postId) {
            setExpandedPost(null);
            setCommentDraft("");
          }

          setComments((prev) => {
            const next = { ...prev };
            delete next[postId];
            return next;
          });

          fetchPosts();
        }
      }
    ]);
  };

  const deleteComment = async (postId: string, commentId: string) => {
    if (!userId) return;

    Alert.alert(t("communityDeleteCommentTitle"), t("communityDeleteCommentMsg"), [
      { text: t("back"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("community_comments")
            .delete()
            .eq("id", commentId)
            .eq("user_id", userId);

          if (error) {
            Alert.alert("Error", error.message);
            return;
          }

          fetchComments(postId);
          fetchPosts();
        }
      }
    ]);
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const renderPost = ({ item }: { item: Post }) => (
    <AppCard style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.avatarSmall}>
          <Text style={styles.avatarLetter}>
            {item.is_anonymous ? "?" : item.author_name.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.author}>{item.author_name}</Text>
          <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
        </View>
        {item.user_id === userId ? (
          <Pressable style={styles.deleteBtn} onPress={() => deletePost(item.id)}>
            <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.body}>{item.text}</Text>

      <View style={styles.actions}>
        <Pressable style={styles.actionBtn} onPress={() => toggleLike(item.id, item.userLiked)}>
          <Ionicons
            name={item.userLiked ? "heart" : "heart-outline"}
            size={18}
            color={item.userLiked ? colors.primary : colors.textMuted}
          />
          <Text style={[styles.actionText, item.userLiked && { color: colors.primary }]}>
            {item.likes}
          </Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={() => toggleExpand(item.id)}>
          <Ionicons
            name={expandedPost === item.id ? "chatbubble" : "chatbubble-outline"}
            size={16}
            color={expandedPost === item.id ? colors.primaryDark : colors.textMuted}
          />
          <Text style={styles.actionText}>{item.commentsCount}</Text>
        </Pressable>
      </View>

      {expandedPost === item.id && (
        <View style={styles.commentsSection}>
          {(comments[item.id] ?? []).map((c) => (
            <View key={c.id} style={styles.commentRow}>
              <View style={styles.commentAvatarSmall}>
                <Text style={styles.commentAvatarLetter}>
                  {c.is_anonymous ? "?" : c.author_name.slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.commentAuthor}>{c.author_name}</Text>
                <Text style={styles.commentText}>{c.text}</Text>
              </View>
              {c.user_id === userId ? (
                <Pressable style={styles.commentDeleteBtn} onPress={() => deleteComment(item.id, c.id)}>
                  <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>
          ))}
          <View style={styles.commentInputRow}>
            <TextInput
              value={commentDraft}
              onChangeText={setCommentDraft}
              style={styles.commentInput}
              placeholder={t("sharePlaceholder")}
              placeholderTextColor={colors.textMuted}
              textContentType="none"
              autoComplete="off"
            />
            <Pressable style={styles.commentSendBtn} onPress={() => submitComment(item.id)}>
              <Ionicons name="send" size={14} color="#FFF" />
            </Pressable>
          </View>
        </View>
      )}
    </AppCard>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={t("community")} subtitle={t("communitySubtitle")} />

        <AppCard>
          <SectionHeader title={t("shareWithCommunity")} />
          <TextInput
            value={draft}
            onChangeText={setDraft}
            style={styles.input}
            placeholder={t("sharePlaceholder")}
            placeholderTextColor={colors.textMuted}
            multiline
            textContentType="none"
            autoComplete="off"
          />
          <View style={styles.postOptions}>
            <Pressable style={styles.anonToggle} onPress={() => setIsAnonymous((v) => !v)}>
              <Ionicons
                name={isAnonymous ? "eye-off" : "person"}
                size={16}
                color={colors.primaryDark}
              />
              <Text style={styles.anonText}>
                {isAnonymous ? "Post anonymously" : `Post as ${displayName}`}
              </Text>
            </Pressable>
            <Pressable style={styles.postBtn} onPress={submitPost}>
              <Text style={styles.postBtnText}>{t("post")}</Text>
            </Pressable>
          </View>
        </AppCard>

        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          contentContainerStyle={{ paddingBottom: 110 }}
          ListEmptyComponent={
            <Text style={styles.empty}>{loading ? "Loading..." : t("noPostsYet")}</Text>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: "#FFF9FD",
    minHeight: 92,
    padding: spacing.sm,
    color: colors.text,
    textAlignVertical: "top"
  },
  postOptions: {
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  anonToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    backgroundColor: "#FFF9FD",
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  anonText: { color: colors.primaryDark, fontWeight: "600", fontSize: 12 },
  postBtn: {
    alignItems: "center",
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg
  },
  postBtnText: { color: "#FFF", fontWeight: "700" },
  postCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FFFFFF"
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8
  },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F4D5E6",
    alignItems: "center",
    justifyContent: "center"
  },
  avatarLetter: { color: colors.primaryDark, fontWeight: "800", fontSize: 14 },
  author: { color: colors.primaryDark, fontWeight: "700" },
  time: { color: colors.textMuted, fontSize: 11 },
  body: { color: colors.text, lineHeight: 21 },
  actions: {
    flexDirection: "row",
    gap: 16,
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionText: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  commentsSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8
  },
  commentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FFF9FD",
    borderRadius: 12,
    padding: 10
  },
  commentAvatarSmall: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F4D5E6",
    alignItems: "center",
    justifyContent: "center"
  },
  commentAvatarLetter: { color: colors.primaryDark, fontWeight: "800", fontSize: 10 },
  commentAuthor: { color: colors.primaryDark, fontWeight: "700", fontSize: 12 },
  commentText: { color: colors.text, fontSize: 13, lineHeight: 18, marginTop: 2 },
  commentDeleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  commentInputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    backgroundColor: "#FFF9FD",
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: colors.text,
    fontSize: 13
  },
  commentSendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  empty: { color: colors.textMuted, paddingHorizontal: spacing.sm, marginTop: spacing.md }
});
