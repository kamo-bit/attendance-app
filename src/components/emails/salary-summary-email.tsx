import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface SalarySummaryEmailProps {
  userName: string;
  period: string;
  totalWorkHours: string;
  totalWorkDays: number;
  totalSalary: string;
}

export const SalarySummaryEmail = ({
  userName = "User",
  period = "this month",
  totalWorkHours = "0h 0m",
  totalWorkDays = 0,
  totalSalary = "¥0",
}: SalarySummaryEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Your Salary Summary for {period}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Salary Summary</Heading>
          <Text style={text}>Hi {userName},</Text>
          <Text style={text}>
            Here is your salary summary for the payroll period: <strong>{period}</strong>.
          </Text>
          
          <Section style={summarySection}>
            <Text style={summaryLabel}>Total Work Time</Text>
            <Text style={summaryValue}>{totalWorkHours}</Text>
            
            <Text style={summaryLabel}>Total Days Worked</Text>
            <Text style={summaryValue}>{totalWorkDays} days</Text>
            
            <Hr style={hr} />
            
            <Text style={summaryLabel}>Total Salary</Text>
            <Text style={salaryValue}>{totalSalary}</Text>
          </Section>

          <Text style={footer}>
            This is an automated email from your Attendance App.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default SalarySummaryEmail;

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  borderRadius: "12px",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
};

const h1 = {
  color: "#333",
  fontSize: "24px",
  fontWeight: "bold",
  textAlign: "center" as const,
  margin: "30px 0",
};

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
  padding: "0 48px",
};

const summarySection = {
  padding: "24px 48px",
  backgroundColor: "#f8fafc",
  borderRadius: "8px",
  margin: "24px 48px",
};

const summaryLabel = {
  fontSize: "14px",
  fontWeight: "bold",
  textTransform: "uppercase" as const,
  color: "#64748b",
  margin: "0 0 4px",
};

const summaryValue = {
  fontSize: "20px",
  fontWeight: "bold",
  color: "#0f172a",
  margin: "0 0 16px",
};

const salaryValue = {
  fontSize: "32px",
  fontWeight: "bold",
  color: "#2563eb",
  margin: "0",
};

const hr = {
  borderColor: "#e2e8f0",
  margin: "20px 0",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  textAlign: "center" as const,
  marginTop: "60px",
};
