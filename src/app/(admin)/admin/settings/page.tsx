"use client";

import React, { useState } from "react";
import {
  User,
  Store,
  Bell,
  Mail,
  Shield,
  MapPin,
  Phone,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils/helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

export default function SettingsPage() {
  // Notification preferences (placeholder state)
  const [emailOrderPlaced, setEmailOrderPlaced] = useState(true);
  const [emailOrderShipped, setEmailOrderShipped] = useState(true);
  const [emailLowStock, setEmailLowStock] = useState(true);
  const [emailDailyReport, setEmailDailyReport] = useState(false);
  const [emailReturns, setEmailReturns] = useState(true);
  const [emailNewCustomer, setEmailNewCustomer] = useState(false);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-secondary border border-border">
          <TabsTrigger value="profile" className="gap-2 data-[state=active]:bg-card">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="store" className="gap-2 data-[state=active]:bg-card">
            <Store className="h-4 w-4" />
            Store
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2 data-[state=active]:bg-card">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="bg-card rounded-xl border border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <User className="h-5 w-5 text-primary" />
                Admin Profile
              </CardTitle>
              <CardDescription>
                Your account information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar and name */}
              <div className="flex items-center gap-5">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">VP</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    V&P Admin
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    V&P Computer Shop Administrator
                  </p>
                  <Badge variant="default" className="mt-2">
                    <Shield className="h-3 w-3 mr-1" />
                    Super Admin
                  </Badge>
                </div>
              </div>

              <Separator className="bg-border" />

              {/* Profile fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Full Name</Label>
                  <Input
                    value="V&P Admin"
                    disabled
                    className="bg-secondary border-border disabled:opacity-70"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Email Address</Label>
                  <Input
                    value="admin@vpcomputer.in"
                    disabled
                    className="bg-secondary border-border disabled:opacity-70"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Role</Label>
                  <Input
                    value="Administrator"
                    disabled
                    className="bg-secondary border-border disabled:opacity-70"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Member Since</Label>
                  <Input
                    value="March 2026"
                    disabled
                    className="bg-secondary border-border disabled:opacity-70"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-4">
                <p className="text-sm text-muted-foreground text-center">
                  Profile editing and password change functionality coming soon.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Store Tab */}
        <TabsContent value="store" className="space-y-6">
          <Card className="bg-card rounded-xl border border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Store className="h-5 w-5 text-primary" />
                Store Information
              </CardTitle>
              <CardDescription>
                Configure your store details visible to customers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-foreground">Store Name</Label>
                  <Input
                    value="V&P Computer Shop"
                    disabled
                    className="bg-secondary border-border disabled:opacity-70"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-foreground">Store Description</Label>
                  <Textarea
                    value="Your trusted destination for refurbished laptops, new laptops, motherboards, ICs, and hardware components in Patna, Bihar."
                    disabled
                    rows={3}
                    className="bg-secondary border-border disabled:opacity-70 resize-none"
                  />
                </div>
              </div>

              <Separator className="bg-border" />

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  Contact & Location
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-foreground flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      Phone Number
                    </Label>
                    <Input
                      placeholder="+91 XXXXX XXXXX"
                      disabled
                      className="bg-secondary border-border disabled:opacity-70"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      Support Email
                    </Label>
                    <Input
                      placeholder="support@vpcomputer.in"
                      disabled
                      className="bg-secondary border-border disabled:opacity-70"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-foreground flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      Store Address
                    </Label>
                    <Textarea
                      placeholder="Full store address, Patna, Bihar"
                      disabled
                      rows={2}
                      className="bg-secondary border-border disabled:opacity-70 resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      Website URL
                    </Label>
                    <Input
                      placeholder="https://vpcomputer.in"
                      disabled
                      className="bg-secondary border-border disabled:opacity-70"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-4">
                <p className="text-sm text-muted-foreground text-center">
                  Store settings, tax configuration, and shipping zones coming
                  soon.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="bg-card rounded-xl border border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Bell className="h-5 w-5 text-primary" />
                Email Notifications
              </CardTitle>
              <CardDescription>
                Choose which email notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {/* Notification items */}
              {[
                {
                  id: "order-placed",
                  label: "New Order Placed",
                  description:
                    "Get notified whenever a new order is placed on the store",
                  checked: emailOrderPlaced,
                  onChange: setEmailOrderPlaced,
                },
                {
                  id: "order-shipped",
                  label: "Order Shipped",
                  description:
                    "Receive confirmation when an order is marked as shipped",
                  checked: emailOrderShipped,
                  onChange: setEmailOrderShipped,
                },
                {
                  id: "low-stock",
                  label: "Low Stock Alerts",
                  description:
                    "Get alerted when product stock drops below threshold",
                  checked: emailLowStock,
                  onChange: setEmailLowStock,
                },
                {
                  id: "daily-report",
                  label: "Daily Sales Report",
                  description:
                    "Receive a daily summary of orders and revenue at 9 AM",
                  checked: emailDailyReport,
                  onChange: setEmailDailyReport,
                },
                {
                  id: "returns",
                  label: "Returns & Refunds",
                  description:
                    "Get notified when a customer initiates a return or refund",
                  checked: emailReturns,
                  onChange: setEmailReturns,
                },
                {
                  id: "new-customer",
                  label: "New Customer Registration",
                  description:
                    "Receive a notification when a new customer signs up",
                  checked: emailNewCustomer,
                  onChange: setEmailNewCustomer,
                },
              ].map((item, index, arr) => (
                <React.Fragment key={item.id}>
                  <div className="flex items-center justify-between py-4 px-1">
                    <div className="space-y-0.5 flex-1 mr-4">
                      <Label
                        htmlFor={item.id}
                        className="text-sm font-medium text-foreground cursor-pointer"
                      >
                        {item.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                    <Switch
                      id={item.id}
                      checked={item.checked}
                      onCheckedChange={item.onChange}
                    />
                  </div>
                  {index < arr.length - 1 && (
                    <Separator className="bg-border" />
                  )}
                </React.Fragment>
              ))}

              <div className="pt-4">
                <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Email notification delivery will be configured once the
                    email service is set up.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
