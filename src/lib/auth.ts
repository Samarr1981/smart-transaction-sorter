import { verifyToken } from "./verifyToken";

export function getUserIdFromRequest(request: Request): string | null {
  try {
    const cookieHeader = request.headers.get("cookie");
    
    if (cookieHeader) {
      const cookies = cookieHeader.split(";").reduce((acc: any, cookie) => {
        const [key, value] = cookie.trim().split("=");
        acc[key] = value;
        return acc;
      }, {});

      if (cookies.token) {
        const decoded = verifyToken(cookies.token) as any;
        
        if (decoded && decoded.userId) {
          return decoded.userId;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Auth error:", error);
    return null;
  }
}