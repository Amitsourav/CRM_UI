import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { access_token } = await request.json();
  const response = NextResponse.json({ success: true });
  response.cookies.set("access_token", access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("access_token");
  return response;
}
