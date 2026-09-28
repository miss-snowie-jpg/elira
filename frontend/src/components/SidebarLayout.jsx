import React from "react";
import "./SidebarLayout.css";
import {
  ChevronRightRounded,
  SearchRounded,
  AddRounded,
  MoreHorizRounded,
  ChatBubbleOutlineRounded,
} from "@mui/icons-material";
import { useLocation, useNavigate } from "react-router";

function SidebarLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [chats, setChats] = React.useState([]);
  const [search, setSearch] = React.useState("");
  const [isLoadingChats, setIsLoadingChats] = React.useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  /*
   * Get the logged-in user.
   * Your existing Auth system stores the user in localStorage.
   */
  const getUser = () => {
    try {
      const storedUser = localStorage.getItem("user");

      if (!storedUser) return null;

      return JSON.parse(storedUser);
    } catch (error) {
      console.error("Failed to read user:", error);
      return null;
    }
  };

  /*
   * Load previous conversations.
   */
  const loadChats = React.useCallback(async () => {
    const user = getUser();

    if (!user?.id) {
      setChats([]);
      return;
    }

    setIsLoadingChats(true);

    try {
      const response = await fetch(
        `http://localhost:8000/chats/${user.id}`
      );

      if (!response.ok) {
        throw new Error(`Failed to load chats: ${response.status}`);
      }

      const data = await response.json();

      /*
       * Your backend may return the chats directly
       * or inside a "chats" property.
       */
      const loadedChats = Array.isArray(data)
        ? data
        : data.chats || [];

      setChats(loadedChats);
    } catch (error) {
      console.error("Failed to load conversations:", error);
      setChats([]);
    } finally {
      setIsLoadingChats(false);
    }
  }, []);

  /*
   * Load chats when the sidebar mounts.
   */
  React.useEffect(() => {
    loadChats();
  }, [loadChats]);

  /*
   * Reload chats whenever we return to the chat page.
   */
  React.useEffect(() => {
    if (location.pathname === "/chat") {
      loadChats();
    }
  }, [location.pathname, loadChats]);

  /*
   * Navigation items.
   */
  const navigation = [
    {
      text: "Dashboard",
      icon: "⌂",
    },
    {
      text: "AI Assistant",
      icon: "✦",
      path: "/chat",
    },
    {
      text: "Business",
      icon: "▣",
    },
    {
      text: "Analytics",
      icon: "◫",
    },
    {
      text: "Finance",
      icon: "$",
    },
    {
      text: "Tax",
      icon: "▤",
    },
    {
      text: "Documents",
      icon: "▧",
      path: "/documents",
    },
    {
      text: "Agents",
      icon: "◇",
    },
    {
      text: "Messages",
      icon: "✉",
    },
  ];

  /*
   * Create a new conversation.
   */
  const handleNewChat = () => {
    navigate("/chat");
  };

  /*
   * Open an existing conversation.
   */
  const handleOpenChat = (chat) => {
    if (!chat?.id) return;

    navigate(`/chat?chatId=${chat.id}`);
  };

  /*
   * Convert different possible backend date fields
   * into a usable JavaScript Date.
   */
  const getChatDate = (chat) => {
    const value =
      chat?.updated_at ||
      chat?.updatedAt ||
      chat?.created_at ||
      chat?.createdAt;

    if (!value) {
      return new Date(0);
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? new Date(0)
      : date;
  };

  /*
   * Group conversations by date.
   */
  const groupedChats = React.useMemo(() => {
    const now = new Date();

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const startOfSevenDaysAgo = new Date(startOfToday);
    startOfSevenDaysAgo.setDate(
      startOfSevenDaysAgo.getDate() - 7
    );

    const groups = {
      today: [],
      yesterday: [],
      previous7Days: [],
      older: [],
    };

    const filteredChats = chats.filter((chat) => {
      const title = String(chat?.title || "").toLowerCase();

      return title.includes(search.toLowerCase());
    });

    filteredChats.forEach((chat) => {
      const date = getChatDate(chat);

      if (date >= startOfToday) {
        groups.today.push(chat);
      } else if (date >= startOfYesterday) {
        groups.yesterday.push(chat);
      } else if (date >= startOfSevenDaysAgo) {
        groups.previous7Days.push(chat);
      } else {
        groups.older.push(chat);
      }
    });

    /*
     * Newest conversations first.
     */
    Object.values(groups).forEach((group) => {
      group.sort(
        (a, b) =>
          getChatDate(b).getTime() -
          getChatDate(a).getTime()
      );
    });

    return groups;
  }, [chats, search]);

  /*
   * Render one conversation.
   */
  const renderChat = (chat) => {
    const isCurrentChat =
      new URLSearchParams(location.search).get("chatId") ===
      String(chat.id);

    return (
      <button
        type="button"
        key={chat.id}
        className={`conversation-item ${
          isCurrentChat ? "conversation-active" : ""
        }`}
        onClick={() => handleOpenChat(chat)}
      >
        <span className="conversation-icon">
          <ChatBubbleOutlineRounded />
        </span>

        <span className="conversation-content">
          <span className="conversation-title">
            {chat.title || "New Chat"}
          </span>

          {chat.last_message && (
            <span className="conversation-preview">
              {chat.last_message}
            </span>
          )}
        </span>

        <MoreHorizRounded className="conversation-more" />
      </button>
    );
  };

  return (
    <div
      className={`sidebar-layout ${
        isSidebarOpen
          ? "sidebar-is-open"
          : "sidebar-is-collapsed"
      }`}
    >
      <aside
        className={`sidebar ${
          isSidebarOpen ? "open" : ""
        }`}
      >
        {/* COLLAPSE BUTTON */}
        <button
          type="button"
          className="size-btn"
          onClick={() =>
            setIsSidebarOpen((prev) => !prev)
          }
          aria-label={
            isSidebarOpen
              ? "Collapse sidebar"
              : "Open sidebar"
          }
        >
          <ChevronRightRounded className="icon-arrow" />

          <span className="btn-text">
            Collapse Sidebar
          </span>
        </button>

        {/* NAVIGATION */}
        <nav className="sidebar-nav">
          {navigation.map((item) => (
            <button
              type="button"
              key={item.text}
              className={`sidebar-item ${
                location.pathname === item.path
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                item?.path && navigate(item.path)
              }
            >
              <span className="sidebar-item-icon">
                {item.icon}
              </span>

              <span className="btn-text">
                {item.text}
              </span>
            </button>
          ))}
        </nav>

        {/* CONVERSATION LIBRARY */}
        <section className="conversation-library">
          {/* LIBRARY HEADER */}
          <div className="library-header">
            <span className="library-title">
              Conversations
            </span>

            <button
              type="button"
              className="new-chat-btn"
              onClick={handleNewChat}
              title="New conversation"
            >
              <AddRounded />
            </button>
          </div>

          {/* SEARCH */}
          <div className="conversation-search">
            <SearchRounded />

            <input
              type="text"
              placeholder="Search chats..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          {/* CHAT LIST */}
          <div className="conversation-list">
            {isLoadingChats ? (
              <div className="conversation-empty">
                Loading conversations...
              </div>
            ) : (
              <>
                {groupedChats.today.length > 0 && (
                  <div className="conversation-group">
                    <div className="conversation-group-title">
                      Today
                    </div>

                    {groupedChats.today.map(renderChat)}
                  </div>
                )}

                {groupedChats.yesterday.length > 0 && (
                  <div className="conversation-group">
                    <div className="conversation-group-title">
                      Yesterday
                    </div>

                    {groupedChats.yesterday.map(renderChat)}
                  </div>
                )}

                {groupedChats.previous7Days.length > 0 && (
                  <div className="conversation-group">
                    <div className="conversation-group-title">
                      Previous 7 Days
                    </div>

                    {groupedChats.previous7Days.map(
                      renderChat
                    )}
                  </div>
                )}

                {groupedChats.older.length > 0 && (
                  <div className="conversation-group">
                    <div className="conversation-group-title">
                      Older
                    </div>

                    {groupedChats.older.map(renderChat)}
                  </div>
                )}

                {!Object.values(groupedChats).some(
                  (group) => group.length > 0
                ) && (
                  <div className="conversation-empty">
                    {search
                      ? "No conversations found."
                      : "No conversations yet."}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </aside>

      {/* PAGE CONTENT */}
      <main className="page">{children}</main>
    </div>
  );
}

export default SidebarLayout;