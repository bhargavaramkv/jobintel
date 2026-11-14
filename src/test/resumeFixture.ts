/** A small LaTeX resume for tests. The person and employer are placeholders. */
export const SAMPLE_TEX = String.raw`\documentclass[10pt,a4paper]{article}
\newcommand{\role}[3]{\textbf{#1} \hfill #3 \ \textit{#2}}
\begin{document}
\begin{center}
  {\LARGE \textbf{Sample Person}} \[4pt]
  Bengaluru, India
\end{center}

\section{Summary}
Backend-leaning full-stack engineer building services in C\# and .NET, plus React front ends.

\section{Skills}
\textbf{Core:} C\#, .NET, SQL Server, REST APIs, React, TypeScript, Docker, Azure, Redis

\section{Experience}
\role{Software Engineer II}{Example Payments}{2022 -- Present}
\begin{itemize}
  \item Built a ledger service in C\# and .NET with SQL Server.
  \item Shipped a React and TypeScript dashboard.
\end{itemize}
\end{document}
`
