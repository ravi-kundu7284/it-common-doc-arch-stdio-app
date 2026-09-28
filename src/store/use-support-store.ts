import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  SupportTicket,
  UserFeedback,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  TicketComment,
} from "@/types";

interface SupportStoreState {
  tickets: SupportTicket[];
  feedbacks: UserFeedback[];
  activeTicketId: string | null;
  isSupportModalOpen: boolean;
  isFeedbackModalOpen: boolean;

  // Actions
  setSupportModalOpen: (open: boolean) => void;
  setFeedbackModalOpen: (open: boolean) => void;
  setActiveTicketId: (id: string | null) => void;

  createTicket: (data: {
    subject: string;
    category: TicketCategory;
    priority: TicketPriority;
    description: string;
    userEmail: string;
    userName?: string;
    diagnostics?: {
      projectTitle?: string;
      designLevel?: string;
      browser?: string;
      os?: string;
    };
  }) => SupportTicket;

  addTicketComment: (ticketId: string, author: string, message: string, isStaff?: boolean) => void;
  updateTicketStatus: (ticketId: string, status: TicketStatus) => void;
  deleteTicket: (ticketId: string) => void;

  submitFeedback: (data: {
    rating: number;
    category: UserFeedback["category"];
    likes: string;
    improvements: string;
    recommendScore: number;
    userEmail?: string;
  }) => UserFeedback;
}

const generateTicketNumber = (): string => {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `DOC-${num}`;
};

const DEFAULT_SAMPLE_TICKETS: SupportTicket[] = [
  {
    id: "tkt_sample_101",
    ticketNumber: "DOC-2841",
    subject: "Inquiry: Exporting high-resolution vector diagrams to enterprise Confluence",
    category: "feature",
    priority: "medium",
    status: "in_review",
    description:
      "Looking for seamless SVG / vector export of Mermaid sequence and C4 architecture diagrams for direct pasting into Confluence wiki and internal engineering RFCs.",
    userEmail: "architect@company.internal",
    userName: "System Architect",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    diagnostics: {
      projectTitle: "Core Microservices Architecture",
      designLevel: "hld",
      browser: "Chrome 128 / Windows",
      os: "Windows 11",
    },
    comments: [
      {
        id: "comm_1",
        author: "System Architect",
        message: "Can we support 300 DPI SVG exports directly from the Document Studio?",
        timestamp: new Date(Date.now() - 86400000 * 2).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        isStaff: false,
      },
      {
        id: "comm_2",
        author: "DocArch AI Support Team",
        message:
          "Hello! You can currently export full standalone HTML with embedded interactive SVG vector diagrams. Direct 1-click SVG download is scheduled for the upcoming release.",
        timestamp: new Date(Date.now() - 86400000).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        isStaff: true,
      },
    ],
  },
];

export const useSupportStore = create<SupportStoreState>()(
  persist(
    (set, get) => ({
      tickets: DEFAULT_SAMPLE_TICKETS,
      feedbacks: [],
      activeTicketId: null,
      isSupportModalOpen: false,
      isFeedbackModalOpen: false,

      setSupportModalOpen: (open) => set({ isSupportModalOpen: open }),
      setFeedbackModalOpen: (open) => set({ isFeedbackModalOpen: open }),
      setActiveTicketId: (id) => set({ activeTicketId: id }),

      createTicket: (data) => {
        const now = new Date().toISOString();
        const ticketNumber = generateTicketNumber();
        const newTicket: SupportTicket = {
          id: "tkt_" + Math.random().toString(36).substring(2, 9),
          ticketNumber,
          subject: data.subject,
          category: data.category,
          priority: data.priority,
          status: "open",
          description: data.description,
          userEmail: data.userEmail,
          userName: data.userName || "User",
          createdAt: now,
          updatedAt: now,
          diagnostics: data.diagnostics,
          comments: [
            {
              id: "comm_" + Math.random().toString(36).substring(2, 9),
              author: data.userName || "Requester",
              message: data.description,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              isStaff: false,
            },
            {
              id: "comm_bot_" + Math.random().toString(36).substring(2, 9),
              author: "DocArch AI Support Desk",
              message: `Thank you for contacting DocArch AI Studio support. Ticket ${ticketNumber} has been logged and assigned to engineering triage. We will update this thread as work progresses.`,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              isStaff: true,
            },
          ],
        };

        set((state) => ({
          tickets: [newTicket, ...state.tickets],
          activeTicketId: newTicket.id,
        }));

        return newTicket;
      },

      addTicketComment: (ticketId, author, message, isStaff = false) => {
        const comment: TicketComment = {
          id: "comm_" + Math.random().toString(36).substring(2, 9),
          author,
          message,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isStaff,
        };

        set((state) => ({
          tickets: state.tickets.map((t) => {
            if (t.id !== ticketId) return t;
            return {
              ...t,
              updatedAt: new Date().toISOString(),
              comments: [...t.comments, comment],
            };
          }),
        }));
      },

      updateTicketStatus: (ticketId, status) => {
        set((state) => ({
          tickets: state.tickets.map((t) => {
            if (t.id !== ticketId) return t;
            return {
              ...t,
              status,
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      deleteTicket: (ticketId) => {
        set((state) => ({
          tickets: state.tickets.filter((t) => t.id !== ticketId),
          activeTicketId: state.activeTicketId === ticketId ? null : state.activeTicketId,
        }));
      },

      submitFeedback: (data) => {
        const newFeedback: UserFeedback = {
          id: "fb_" + Math.random().toString(36).substring(2, 9),
          rating: data.rating,
          category: data.category,
          likes: data.likes,
          improvements: data.improvements,
          recommendScore: data.recommendScore,
          userEmail: data.userEmail,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          feedbacks: [newFeedback, ...state.feedbacks],
        }));

        return newFeedback;
      },
    }),
    {
      name: "docarch-support-feedback-v1",
      partialize: (state) => ({
        tickets: state.tickets,
        feedbacks: state.feedbacks,
      }),
    }
  )
);
