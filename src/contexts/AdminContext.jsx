import { createContext, useContext, useState, useEffect } from "react";
import { auth } from "../firebase";
import { checkIfUserIsAdmin } from "../utils/admin";
import { useAuthState } from "react-firebase-hooks/auth";

const AdminContext = createContext();

export const useAdmin = () => useContext(AdminContext);

export const AdminProvider = ({ children }) => {
  const [user, loadingAuth] = useAuthState(auth);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const [adminData, setAdminData] = useState(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        setAdminLoading(true);
        try {
          const adminStatus = await checkIfUserIsAdmin(user.uid, user.email);
          setIsAdmin(adminStatus);

          if (adminStatus) {
            setAdminData({
              uid: user.uid,
              email: user.email,
              name: user.displayName,
              permissions: ["all"],
            });
          }
        } catch (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
        } finally {
          setAdminLoading(false);
        }
      } else {
        setIsAdmin(false);
        setAdminLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  const value = {
    isAdmin,
    adminLoading,
    adminData,
    hasPermission: (permission) => {
      if (!isAdmin) return false;
      return (
        adminData?.permissions?.includes("all") ||
        adminData?.permissions?.includes(permission)
      );
    },
  };

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
};
