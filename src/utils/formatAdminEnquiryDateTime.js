const formatAdminEnquiryDateTime = (value) => {
  if (value === null || value === undefined || value === "") return "-";

  const raw = String(value).trim();
  if (raw.startsWith("0001-01-01")) return "-";

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  const date = dateOnly
    ? new Date(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3]),
      )
    : value instanceof Date
      ? value
      : new Date(raw);

  if (Number.isNaN(date.getTime())) return "-";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const hour = date.getHours();
  const hours = String(hour % 12 || 12).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const meridiem = hour < 12 ? "AM" : "PM";

  return `${day}-${month}-${date.getFullYear()},${hours}:${minutes} ${meridiem}`;
};

export default formatAdminEnquiryDateTime;
