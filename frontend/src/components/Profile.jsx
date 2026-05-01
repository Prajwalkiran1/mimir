const Profile = () => {
  const history = [
    { id: 1, title: "Deep_Learning_Lecture.mp4", date: "24 Apr 2026", status: "Completed" },
    { id: 2, title: "Corporate_Townhall.mp4", date: "22 Apr 2026", status: "Completed" }
  ];

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      {/* User Header */}
      <div className="flex items-center gap-8 mb-12 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="w-24 h-24 bg-gold-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">PM</div>
        <div>
          <h2 className="text-3xl font-bold text-blue-900">Pavithra Manikandan</h2>
          <p className="text-gray-500">Student @ B.M.S. College of Engineering</p>
        </div>
      </div>

      <h3 className="text-xl font-bold text-blue-900 mb-6">Past Generations</h3>
      <div className="grid gap-4">
        {history.map(item => (
          <div key={item.id} className="bg-white p-6 rounded-2xl flex justify-between items-center border border-gray-100 hover:shadow-md transition">
            <div className="flex gap-4 items-center">
              <div className="p-3 bg-blue-50 text-blue-900 rounded-lg font-bold">VID</div>
              <div>
                <p className="font-bold text-blue-900">{item.title}</p>
                <p className="text-xs text-gray-400">{item.date}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <button className="text-blue-900 font-bold text-sm hover:underline">View Results</button>
              <button className="text-gold-600 font-bold text-sm hover:underline">Re-run RAG</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Profile;