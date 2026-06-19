import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, updateDoc, doc } from "firebase/firestore";
import { CartItem } from "../contexts/CartContext";
import { notificationService } from "@/lib/notificationService";
import { ADMIN_EMAILS } from "@/lib/config";
import { logger } from "@/lib/logger";

export interface OrderDetails {
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  shippingAddress: string;
  deliveryInstructions: string;
  items: CartItem[];
  totalAmount: number;
  paymentReference: string;
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
}

export const createOrder = async (orderDetails: OrderDetails) => {
  try {
    const docRef = await addDoc(collection(db, "orders"), {
      ...orderDetails,
      createdAt: serverTimestamp(),
    });
    
    logger.info('payment', 'Order created successfully', { orderId: docRef.id, buyerId: orderDetails.buyerId, amount: orderDetails.totalAmount });
    
    // Notify admins
    if (ADMIN_EMAILS && ADMIN_EMAILS.length > 0) {
      try {
        const adminQuery = query(collection(db, "users"), where("email", "in", ADMIN_EMAILS));
        const adminSnap = await getDocs(adminQuery);
        const adminIds = adminSnap.docs.map(doc => doc.id);
        
        if (adminIds.length > 0) {
          await notificationService.sendNotification(
            adminIds,
            "New Order Received",
            `Order from ${orderDetails.buyerName} — ₦${orderDetails.totalAmount.toLocaleString()}`,
            "order",
            `/admin?tab=orders`,
            orderDetails.buyerId,
            orderDetails.buyerName
          );
        }
      } catch (notifyError) {
        console.error("Failed to notify admins about order:", notifyError);
        logger.error('system', 'Failed to notify admins about order', { orderId: docRef.id, error: String(notifyError) });
      }
    }

    return docRef.id;
  } catch (error) {
    console.error("Error creating order:", error);
    logger.error('payment', 'Error creating order', { error: String(error), buyerId: orderDetails.buyerId });
    throw error;
  }
};

export const getUserOrders = async (userId: string) => {
  try {
    const q = query(
      collection(db, "orders"),
      where("buyerId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching user orders:", error);
    throw error;
  }
};

export const getAllOrders = async () => {
  try {
    const q = query(
      collection(db, "orders"),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching all orders:", error);
    throw error;
  }
};

export const updateOrderStatus = async (orderId: string, status: OrderDetails['status']) => {
  try {
    const orderRef = doc(db, "orders", orderId);
    await updateDoc(orderRef, { status });
  } catch (error) {
    console.error("Error updating order status:", error);
    throw error;
  }
};

