import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import HomeClient from "./HomeClient";

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  let username = "Operator";
  let profileImage = null;
  
  if (token) {
    try {
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
      console.log('Decoded token:', decoded);
      
      // For operator login, the token contains phone, so we need to get user data from DB
      if (decoded.phone) {
        // This is an operator token, we need to fetch operator data
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();
        
        try {
          const operator = await prisma.operator.findUnique({
            where: { phone: decoded.phone },
            select: { username: true, profileImage: true }
          });
          
          if (operator) {
            username = operator.username || 'Operator';
            profileImage = operator.profileImage;
          }
        } catch (dbError) {
          console.error('Database error:', dbError);
        } finally {
          await prisma.$disconnect();
        }
      } else {
        // This is a regular user token
        username = decoded.email || decoded.username || 'Operator';
        profileImage = decoded.profileImage || null;
      }
      
      console.log('Final username:', username);
      console.log('Final profileImage:', profileImage);
    } catch (error) {
      console.error('Error verifying token:', error);
      username = "Operator";
    }
  }

  return <HomeClient username={username} profileImage={profileImage} />;
}