import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import StatusModal from "./StatusModal";

const StatusModalContext = createContext(null);

const normalizeType = (type) => {
  const value = String(type || "info").toLowerCase();
  if (["ok", "success"].includes(value)) return "success";
  if (["err", "error"].includes(value)) return "error";
  if (["warn", "warning"].includes(value)) return "warning";
  if (["update", "updated"].includes(value)) return "update";
  return "info";
};

export const StatusModalProvider = ({ children }) => {
  const [modal, setModal] = useState(null);
  const resolveConfirmation = useRef(null);

  const closeModal = useCallback((confirmed = false) => {
    setModal(null);
    if (resolveConfirmation.current) {
      resolveConfirmation.current(confirmed);
      resolveConfirmation.current = null;
    }
  }, []);

  const showStatus = useCallback((type, message, options = {}) => {
    setModal({
      type: normalizeType(type),
      title: options.title,
      message: typeof message === "string" ? message : String(message ?? ""),
      confirmText: options.confirmText || "OK",
      showCancel: false,
    });
  }, []);

  const confirmStatus = useCallback((options = {}) => {
    if (resolveConfirmation.current) resolveConfirmation.current(false);
    return new Promise((resolve) => {
      resolveConfirmation.current = resolve;
      setModal({
        type: "confirm",
        title: options.title || "Please confirm",
        message: options.message || "Are you sure you want to continue?",
        confirmText: options.confirmText || "Confirm",
        cancelText: options.cancelText || "Cancel",
        showCancel: true,
      });
    });
  }, []);

  const value = useMemo(() => ({ showStatus, confirmStatus }), [showStatus, confirmStatus]);

  return (
    <StatusModalContext.Provider value={value}>
      {children}
      <StatusModal
        isOpen={!!modal}
        {...modal}
        onConfirm={() => closeModal(true)}
        onCancel={() => closeModal(false)}
      />
    </StatusModalContext.Provider>
  );
};

export const useStatusModal = () => {
  const context = useContext(StatusModalContext);
  if (!context) throw new Error("useStatusModal must be used inside StatusModalProvider");
  return context;
};

export const useStatusToast = () => {
  const { showStatus } = useStatusModal();
  const setToast = useCallback((nextToast) => {
    if (!nextToast) return;
    const toast = typeof nextToast === "function" ? nextToast(null) : nextToast;
    if (typeof toast === "string") {
      showStatus("success", toast);
      return;
    }
    if (toast) showStatus(toast.tone || toast.type || "info", toast.msg || toast.message || "");
  }, [showStatus]);

  // Existing toast render slots stay empty; notifications are presented by the
  // shared modal mounted at the admin layout.
  return [null, setToast];
};
