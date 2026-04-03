import { format } from 'date-fns';

const PrintHeader = ({ title, subtitle, showDate = true }) => {
  return (
    <div className="mb-8 pb-6 border-b-2 border-gray-300 print-only">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
          {subtitle && <p className="text-lg text-gray-600 mb-4">{subtitle}</p>}
          {showDate && (
            <div className="text-sm text-gray-500">
              Generated on: {format(new Date(), 'dd MMM yyyy, hh:mm a')}
            </div>
          )}
        </div>
        <div className="text-right">
          {/* Logo */}
          <div className="mb-3">
            <img 
              src="/logo.jpg" 
              alt="ParNets Logo" 
              className="h-16 ml-auto"
            />
          </div>
          {/* Company Details */}
          <div className="text-sm text-gray-600">
            <div className="font-bold text-lg text-gray-900 mb-2">ParNets Software India Pvt Ltd</div>
            <div className="leading-relaxed">
              <div>So104/1/50, Singapura Main Rd,</div>
              <div>Singapura Village, Varadharaja Nagar,</div>
              <div>Vidyaranyapura, Bengaluru,</div>
              <div>Karnataka 560097</div>
              <div className="mt-2 font-medium">GST: 29AANCP7155K1ZN</div>
              <div className="font-medium">Contact: 095909 26068</div>
              <div className="text-indigo-600">hello@parnetsgroup.com</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintHeader;
