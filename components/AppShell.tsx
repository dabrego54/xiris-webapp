"use client"

import type { ReactNode } from "react"
import AppBar from "./AppBar"
import Nav from "./Nav"

type AppShellProps = {
  children: ReactNode
  hideNav?: boolean
}

export default function AppShell({ children, hideNav = false }: AppShellProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <AppBar />
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        {!hideNav && (
          <aside className="hidden border-r border-gray-200 bg-white lg:block lg:w-20">
            <Nav variant="sidebar" />
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>

      {/* Mobile Bottom Nav */}
      {!hideNav && (
        <div className="lg:hidden">
          <Nav variant="bottom" />
        </div>
      )}
    </div>
  )
}
