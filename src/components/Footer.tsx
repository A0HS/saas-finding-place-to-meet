export default function Footer() {
  return (
    <footer className="bg-gray-800 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-semibold text-white text-sm">한국GPT협회</p>
            <p className="text-xs text-gray-400 mt-1">교육 및 컨설팅 문의</p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm">
            <a href="tel:02-562-1552" className="hover:text-white transition-colors">
              02-562-1552
            </a>
            <a href="mailto:GPT@Rnbdp.com" className="hover:text-white transition-colors">
              GPT@Rnbdp.com
            </a>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-700 text-xs text-gray-500">
          개발자 : 안현수
        </div>
      </div>
    </footer>
  );
}
