import { UserProfilePage } from "@/modules/users/components/UserProfilePage";

export default function Page({ params }: { params: { id: string } }) {
  return <UserProfilePage userId={params.id} />;
}
