export default function Logo({ size = 36 }) {
  return (
    <svg
      width={size * 1.8}
      height={size}
      viewBox="0 0 54 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Mentorify logo"
    >
      <path
        d="M38 3C31.373 3 26 8.373 26 15C26 21.627 20.627 27 14 27C7.373 27 2 21.627 2 15"
        stroke="#6C4DFF"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M38 27C44.627 27 50 21.627 50 15C50 8.373 44.627 3 38 3"
        stroke="#482DDB"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M14 3C20.627 3 26 8.373 26 15"
        stroke="#6C4DFF"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
