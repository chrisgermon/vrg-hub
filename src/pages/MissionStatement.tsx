import { Card, CardContent } from "@/components/ui/card";

export default function MissionStatement() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-6">Our Vision & Mission</h1>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold mb-4 text-primary">Our Vision</h2>
                <p className="text-lg leading-relaxed">
                  To be recognised as the leading provider of quality diagnostic imaging services in Australia.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-4 text-primary">Our Mission</h2>
                <p className="text-lg leading-relaxed mb-4">
                  To provide exceptional patient care through:
                </p>
                <ul className="space-y-3 ml-6">
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    <span>Delivering high-quality diagnostic imaging services</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    <span>Maintaining state-of-the-art technology and equipment</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    <span>Employing highly skilled and compassionate staff</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    <span>Ensuring timely and accurate reporting</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    <span>Working collaboratively with referring clinicians</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    <span>Continuous improvement and innovation in our services</span>
                  </li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-4 text-primary">Our Values</h2>
                <ul className="space-y-3 ml-6">
                  <li className="flex items-start">
                    <span className="text-primary mr-2 font-semibold">Excellence:</span>
                    <span>We strive for excellence in everything we do</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2 font-semibold">Compassion:</span>
                    <span>We treat every patient with care and respect</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2 font-semibold">Integrity:</span>
                    <span>We act with honesty and transparency</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2 font-semibold">Innovation:</span>
                    <span>We embrace new technologies and continuous improvement</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2 font-semibold">Collaboration:</span>
                    <span>We work together as a team with our colleagues and partners</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
