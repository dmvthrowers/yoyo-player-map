import ConfirmLocationClient from './ConfirmLocationClient';

export default async function ConfirmLocationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ConfirmLocationClient token={token} />;
}
